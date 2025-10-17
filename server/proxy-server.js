import express from 'express';
import cors from 'cors';
import fetch, { FormData, Blob } from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Allowed origins for credentialed CORS
const DEFAULT_APP_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];
const APP_BASE_URL = process.env.APP_BASE_URL;
const ALLOWED_ORIGINS = (APP_BASE_URL ? [APP_BASE_URL, ...DEFAULT_APP_ORIGINS] : DEFAULT_APP_ORIGINS);
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // allow localhost/127.0.0.1 on any port for dev
  try {
    const u = new URL(origin);
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
  } catch {}
  return false;
}

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Segmind1!';
// Startup diagnostics (masked)
console.log('[AUTH] APP_BASE_URL:', process.env.APP_BASE_URL || 'http://localhost:5173');
const mask = (v) => (v ? `${String(v).slice(0,6)}…` : 'MISSING');
console.log('[AUTH] GOOGLE_CLIENT_ID:', mask(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID));
console.log('[AUTH] GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`);
console.log('[ADMIN] Portal password configured:', process.env.ADMIN_PASSWORD ? 'custom value set' : 'using default');

// Initialize SQLite database for persistent logging
const db = new sqlite3.Database(path.join(__dirname, 'activity.db'));

// Create tables for activity logging
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    endpoint TEXT,
    method TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_body TEXT,
    response_size INTEGER,
    duration INTEGER,
    success BOOLEAN
  )`);
});

// Activity logging system
const activityLogger = {
  log: (logData) => {
    // Store in database
    const stmt = db.prepare(`INSERT INTO api_logs 
      (endpoint, method, request_body, response_status, response_body, response_size, duration, success) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([
      logData.endpoint,
      logData.method,
      JSON.stringify(logData.requestBody),
      logData.responseStatus,
      logData.responseBody,
      logData.responseSize,
      logData.duration,
      logData.success
    ]);
    
    stmt.finalize();
    
    // Emit to connected admin clients
    io.emit('api-activity', {
      ...logData,
      timestamp: new Date().toISOString()
    });
  }
};

// Session configuration for admin authentication
app.use(session({
  secret: 'wtfx-admin-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware
app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), credentials: true }));
// Preflight
app.options('*', cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'admin-ui')));
// Serve generated assets persisted on server
const GENERATED_DIR = path.join(__dirname, 'generated');
const GENERATED_VIDEOS_DIR = path.join(GENERATED_DIR, 'videos');
const GENERATED_THUMBS_DIR = path.join(GENERATED_DIR, 'thumbnails');
app.use('/generated', express.static(GENERATED_DIR));

// Ensure generated directories exist
import fs from 'fs';
import sharp from 'sharp';
try { fs.mkdirSync(GENERATED_VIDEOS_DIR, { recursive: true }); } catch {}
try { fs.mkdirSync(GENERATED_THUMBS_DIR, { recursive: true }); } catch {}

// Helper to persist binary image as JPEG to /generated/thumbnails and return URL
async function saveBufferAsJpegToGenerated(buffer, quality = 90) {
  const name = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const p = path.join(GENERATED_THUMBS_DIR, name);
  try {
    const out = await sharp(Buffer.from(buffer)).jpeg({ quality, mozjpeg: true }).toBuffer();
    fs.writeFileSync(p, out);
  } catch (e) {
    // Fallback: write original bytes with .jpg extension
    try { fs.writeFileSync(p, Buffer.from(buffer)); } catch (err) { console.error('Failed saving image', err); }
  }
  return `/generated/thumbnails/${name}`;
}

function toAbsoluteUrl(req, fileUrl) {
  const host = req.get('host');
  const proto = req.protocol;
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${proto}://${host}${fileUrl}`;
}

// ---------- Google OAuth + Drive integration ----------
let google, OAuth2Client;
async function getGoogle() {
  if (!google) {
    const mod = await import('googleapis');
    google = mod.google;
    OAuth2Client = google.auth.OAuth2;
  }
  return google;
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth env not set: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

async function getAuthedDrive(req) {
  const g = await getGoogle();
  const oauth2Client = getOAuthClient();
  if (!req.session.tokens) throw new Error('Not authenticated');
  oauth2Client.setCredentials(req.session.tokens);
  const drive = g.drive({ version: 'v3', auth: oauth2Client });
  return drive;
}

async function ensureUserFolders(req) {
  const drive = await getAuthedDrive(req);
  if (req.session.driveFolders && req.session.driveFolders.root) return req.session.driveFolders;
  const findFolder = async (name, parent) => {
    const q = parent ? `'${parent}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
                     : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await drive.files.list({ q, fields: 'files(id,name,parents)' });
    return res.data.files?.[0] || null;
  };
  const createFolder = async (name, parent) => {
    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parent ? [parent] : undefined,
      },
      fields: 'id,name'
    });
    return res.data;
  };
  const root = (await findFolder('WTFX News Now')) || (await createFolder('WTFX News Now'));
  const sub = async (n) => (await findFolder(n, root.id)) || (await createFolder(n, root.id));
  const stories = await sub('stories');
  const images = await sub('images');
  const audio = await sub('audio');
  const videos = await sub('videos');
  const segments = await sub('segments');
  req.session.driveFolders = { root: root.id, stories: stories.id, images: images.id, audio: audio.id, videos: videos.id, segments: segments.id };
  return req.session.driveFolders;
}

// Auth status
app.get('/auth/status', async (req, res) => {
  res.json({ authenticated: !!req.session.tokens, user: req.session.user || null });
});

// Start OAuth
app.get('/auth/google', async (req, res) => {
  try {
    await getGoogle();
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.file'
      ],
      state: encodeURIComponent(process.env.APP_BASE_URL || 'http://localhost:5173')
    });
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, error: oauthError, state } = req.query;
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.status(400).send(`Authentication error: ${oauthError}`);
    }
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }
    const g = await getGoogle();
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    // Fetch user info
    const oauth2 = g.oauth2({ version: 'v2', auth: oauth2Client });
    const me = await oauth2.userinfo.get();
    req.session.user = me.data;

    await ensureUserFolders(req);

    // Redirect back to UI (assume Vite dev or production on 5173 by default)
    const target = (state ? decodeURIComponent(state) : (process.env.APP_BASE_URL || 'http://localhost:5173'));
    res.redirect(target);
  } catch (e) {
    console.error('OAuth callback error', e);
    const msg = (e && e.response && e.response.data) ? JSON.stringify(e.response.data) : (e.message || String(e));
    res.status(500).send(`Authentication failed: ${msg}`);
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.tokens = null;
  req.session.user = null;
  req.session.driveFolders = null;
  res.json({ ok: true });
});

// Drive upload endpoint (dataUrl or remote URL)
app.post('/drive/upload', async (req, res) => {
  const start = Date.now();
  try {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    await ensureUserFolders(req);
    const drive = await getAuthedDrive(req);
    const { name, mimeType, folder, dataUrl, url } = req.body;
    const parent = req.session.driveFolders?.[folder] || req.session.driveFolders?.root;
    if (!name || !mimeType) return res.status(400).json({ error: 'name and mimeType required' });

    let buffer;
    if (dataUrl && typeof dataUrl === 'string') {
      const base64 = dataUrl.split(',')[1] || dataUrl;
      buffer = Buffer.from(base64, 'base64');
    } else if (url) {
      // Support absolute URLs and local server file paths under /generated
      if (typeof url === 'string' && url.startsWith('/generated/')) {
        const rel = url.replace(/^\/generated\//, '');
        const p = path.join(GENERATED_DIR, rel);
        buffer = fs.readFileSync(p);
      } else {
        const absolute = typeof url === 'string' && url.startsWith('http') ? url : `http://localhost:${PORT}${url}`;
        const r = await fetch(absolute);
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        const ab = await r.arrayBuffer();
        buffer = Buffer.from(ab);
      }
    } else {
      return res.status(400).json({ error: 'dataUrl or url required' });
    }

    const fileRes = await drive.files.create({
      requestBody: { name, parents: parent ? [parent] : undefined },
      media: { mimeType, body: Buffer.from(buffer) },
      fields: 'id, name, webViewLink, webContentLink'
    });

    activityLogger.log({ endpoint: '/drive/upload', method: 'POST', requestBody: { name, mimeType, folder }, responseStatus: 200, responseBody: JSON.stringify(fileRes.data), responseSize: JSON.stringify(fileRes.data).length, duration: Date.now() - start, success: true });
    res.json(fileRes.data);
  } catch (e) {
    const msg = e && e.response && e.response.data ? JSON.stringify(e.response.data) : (e.message || String(e));
    activityLogger.log({ endpoint: '/drive/upload', method: 'POST', requestBody: req.body, responseStatus: 500, responseBody: msg, responseSize: (msg||'').length, duration: Date.now() - start, success: false });
    res.status(500).json({ error: msg });
  }
});

// Simple JSON KV via Drive (stored under stories by default)
app.post('/drive/kv/set', async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    await ensureUserFolders(req);
    const drive = await getAuthedDrive(req);
    const { name, data, folder } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const parent = req.session.driveFolders?.[folder] || req.session.driveFolders?.stories;
    const filename = `${name}.json`;
    const q = `'${parent}' in parents and name='${filename}' and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id,name)' });
    const body = JSON.stringify(data ?? {}, null, 2);
    if (list.data.files?.length) {
      await drive.files.update({ fileId: list.data.files[0].id, media: { mimeType: 'application/json', body } });
      return res.json({ id: list.data.files[0].id, updated: true });
    } else {
      const created = await drive.files.create({ requestBody: { name: filename, parents: [parent] }, media: { mimeType: 'application/json', body }, fields: 'id' });
      return res.json({ id: created.data.id, created: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get('/drive/kv/get', async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    await ensureUserFolders(req);
    const drive = await getAuthedDrive(req);
    const name = req.query.name;
    const folder = req.query.folder;
    if (!name) return res.status(400).json({ error: 'name required' });
    const parent = req.session.driveFolders?.[folder] || req.session.driveFolders?.stories;
    const filename = `${name}.json`;
    const q = `'${parent}' in parents and name='${filename}' and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id,name)' });
    if (!list.data.files?.length) return res.json(null);
    const fileId = list.data.files[0].id;
    const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    const chunks = [];
    await new Promise((resolve, reject) => {
      response.data.on('data', (c) => chunks.push(c));
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
    const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
// Stories persistence on Drive
app.post('/drive/save-story', async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    await ensureUserFolders(req);
    const drive = await getAuthedDrive(req);
    const { storyId, storedStory } = req.body;
    if (!storyId || !storedStory) return res.status(400).json({ error: 'storyId and storedStory required' });
    const json = JSON.stringify(storedStory, null, 2);
    // Upsert by name
    const q = `'${req.session.driveFolders.stories}' in parents and name='${storyId}.json' and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id,name)' });
    if (list.data.files?.length) {
      await drive.files.update({ fileId: list.data.files[0].id, media: { mimeType: 'application/json', body: json } });
      return res.json({ id: list.data.files[0].id, updated: true });
    } else {
      const created = await drive.files.create({ requestBody: { name: `${storyId}.json`, parents: [req.session.driveFolders.stories] }, media: { mimeType: 'application/json', body: json }, fields: 'id' });
      return res.json({ id: created.data.id, created: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/drive/stories', async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    await ensureUserFolders(req);
    const drive = await getAuthedDrive(req);
    const files = await drive.files.list({ q: `'${req.session.driveFolders.stories}' in parents and trashed=false`, fields: 'files(id,name,modifiedTime,createdTime)' });
    const results = [];
    for (const f of files.data.files || []) {
      const resp = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'stream' });
      const chunks = [];
      await new Promise((resolve, reject) => {
        resp.data.on('data', (c) => chunks.push(c));
        resp.data.on('end', resolve);
        resp.data.on('error', reject);
      });
      const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      results.push(data);
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/drive/story/:storyId', async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    await ensureUserFolders(req);
    const drive = await getAuthedDrive(req);
    const storyId = req.params.storyId;
    const q = `'${req.session.driveFolders.stories}' in parents and name='${storyId}.json' and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id)' });
    if (list.data.files?.length) {
      await drive.files.delete({ fileId: list.data.files[0].id });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// Admin login endpoint
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password && password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin logout endpoint
app.post('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-ui', 'index.html'));
});

// Get activity logs endpoint
app.get('/admin/logs', requireAuth, (req, res) => {
  const limit = req.query.limit || 100;
  const offset = req.query.offset || 0;
  
  db.all(`SELECT * FROM api_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?`, 
    [limit, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get activity statistics
app.get('/admin/stats', requireAuth, (req, res) => {
  const stats = {};
  
  // Total requests
  db.get(`SELECT COUNT(*) as total FROM api_logs`, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    stats.totalRequests = row.total;
    
    // Success rate
    db.get(`SELECT COUNT(*) as successful FROM api_logs WHERE success = 1`, (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      stats.successfulRequests = row.successful;
      stats.successRate = stats.totalRequests > 0 ? (row.successful / stats.totalRequests * 100).toFixed(2) : 0;
      
      // Requests by endpoint
      db.all(`SELECT endpoint, COUNT(*) as count FROM api_logs GROUP BY endpoint ORDER BY count DESC`, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        stats.endpointStats = rows;
        
        // Average response time
        db.get(`SELECT AVG(duration) as avgDuration FROM api_logs WHERE duration IS NOT NULL`, (err, row) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          stats.avgResponseTime = row.avgDuration ? Math.round(row.avgDuration) : 0;
          
          res.json(stats);
        });
      });
    });
  });
});

// Removed Gemini Imagen endpoints; using Segmind for images

// Segmind Background Removal API proxy
app.post('/api/segmind/bg-removal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { image, method = 'object' } = req.body;
    const apiKey = process.env.VITE_SEGMIND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_SEGMIND_API_KEY not configured' });
    }

    const requestBody = {
      image: image,
      method: method,
      "image_format": "png",
      "image_quality": "95"
    };

    console.log('🖼️ [SEGMIND BG REMOVAL] Starting background removal');
    console.log('📤 [REQUEST] URL:', 'https://api.segmind.com/v1/transparent-background-maker');
    console.log('📤 [REQUEST] Headers:', {
      'x-api-key': `${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    console.log('📤 [REQUEST] Body:', JSON.stringify({
      ...requestBody,
      image: image ? `[base64 image data - ${image.length} chars]` : null
    }, null, 2));

    const response = await fetch('https://api.segmind.com/v1/bg-removal', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [RESPONSE] Status:', response.status, response.statusText);
    console.log('📥 [RESPONSE] Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RESPONSE] Error Body:', errorText);
      
      activityLogger.log({
        endpoint: '/api/segmind/bg-removal',
        method: 'POST',
        requestBody: { ...requestBody, image: '[base64 data]' },
        responseStatus: response.status,
        responseBody: errorText,
        responseSize: errorText.length,
        duration: Date.now() - startTime,
        success: false
      });
      
      throw new Error(`Segmind Background Removal API error: ${response.status} - ${errorText}`);
    }

    // Segmind returns image data directly
    const imageBuffer = await response.arrayBuffer();
    const fileUrl = await saveBufferAsJpegToGenerated(imageBuffer, 90);

    console.log('📥 [RESPONSE] Success - Background removed, size:', imageBuffer.byteLength, 'bytes');
    console.log('✅ [SEGMIND BG REMOVAL] Background removal completed successfully');
    
    activityLogger.log({
      endpoint: '/api/segmind/bg-removal',
      method: 'POST',
      requestBody: { ...requestBody, image: '[base64 data]' },
      responseStatus: response.status,
      responseBody: `Background removed (${imageBuffer.byteLength} bytes)`,
      responseSize: imageBuffer.byteLength,
      duration: Date.now() - startTime,
      success: true
    });
      const absolute = toAbsoluteUrl(req, fileUrl);

    res.json({ imageUrl: absolute });
  } catch (error) {
    console.error('❌ [SEGMIND BG REMOVAL] Error:', error.message);
    
    activityLogger.log({
      endpoint: '/api/segmind/bg-removal',
      method: 'POST',
      requestBody: req.body,
      responseStatus: 500,
      responseBody: error.message,
      responseSize: error.message.length,
      duration: Date.now() - startTime,
      success: false
    });
    
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'WTFX News Now Proxy Server is running' });
});

// Test Runway API connection
app.get('/test-runway', async (req, res) => {
  try {
    const runwayApiKey = process.env.VITE_RUNWAY_API_KEY;
    
    if (!runwayApiKey) {
      return res.status(400).json({ error: 'VITE_RUNWAY_API_KEY not configured' });
    }

    console.log('🧪 Testing Runway API connection...');
    console.log('🔑 API Key (first 20 chars):', runwayApiKey.substring(0, 20) + '...');
    
    const testBody = {
      promptText: "test image",
      ratio: "1024:1024",
      model: "gen4_image",
      contentModeration: {
        publicFigureThreshold: "auto"
      }
    };
    
    console.log('📤 Test request body:', JSON.stringify(testBody, null, 2));

    const testResponse = await fetch('https://api.dev.runwayml.com/v1/text_to_image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBody)
    });

    console.log('🔍 Test response status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('❌ Test error response:', errorText);
      return res.status(testResponse.status).json({ 
        error: `API test failed: ${testResponse.status}`,
        details: errorText 
      });
    }

    const testResult = await testResponse.json();
    console.log('✅ Test success:', testResult);
    res.json({ status: 'success', message: 'Runway API connection working', result: testResult });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini API proxy
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.VITE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_API_KEY not configured' });
    }

    // Import Gemini dynamically since it's ESM
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Removed Google Imagen4 proxy; using Segmind

// Removed Veo3 routes

// Runway video API proxy
// Removed Runway endpoints; using Sora instead

// Runway image generation API proxy (deprecated)
// Removed Runway endpoints

// Runway task polling endpoint  (deprecated)
// Removed Runway endpoints

// Runway video generation with first frame API proxy (deprecated)
// Removed Runway endpoints

// Runway polling endpoint
// Removed Runway endpoints

// Chatterbox API proxy
app.post('/api/chatterbox/generate', async (req, res) => {
  try {
    const { audioUrl, characterName } = req.body;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_REPLICATE_API_KEY not configured' });
    }

    const response = await fetch('https://api.replicate.com/v1/models/chatterbox/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          audio_url: audioUrl,
          speaker_name: characterName
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Chatterbox API error: ${response.status}`);
    }

    const prediction = await response.json();
    res.json(prediction);
  } catch (error) {
    console.error('Chatterbox API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chatterbox polling endpoint
app.get('/api/chatterbox/poll/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error('Failed to poll Chatterbox prediction status');
    }

    const pollData = await response.json();
    res.json(pollData);
  } catch (error) {
    console.error('Chatterbox polling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ideogram API proxy for logos
app.post('/api/ideogram/generate-logo', async (req, res) => {
  try {
    const { prompt, aspectRatio, style } = req.body;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_REPLICATE_API_KEY not configured' });
    }

    console.log('🎨 Generating logo with Ideogram:', prompt);

    const response = await fetch('https://api.replicate.com/v1/models/ideogram-ai/ideogram-v2/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          aspect_ratio: aspectRatio || '16:9',
          style_type: style || 'design',
          magic_prompt_option: 'Auto'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ideogram API error: ${response.status}`);
    }

    const prediction = await response.json();
    console.log('✅ Ideogram logo generation started:', prediction.id);
    res.json(prediction);
  } catch (error) {
    console.error('Ideogram logo API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ideogram API proxy for lower thirds
app.post('/api/ideogram/generate', async (req, res) => {
  try {
    const { lowerThird } = req.body;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_REPLICATE_API_KEY not configured' });
    }

    // For now, use a placeholder implementation
    // You can replace this with the actual Ideogram API endpoint
    const response = await fetch('https://api.replicate.com/v1/models/ideogram-ai/ideogram-v2/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          prompt: `News lower third graphic: ${lowerThird.header} - ${lowerThird.subheader}`,
          style_type: "design"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ideogram API error: ${response.status}`);
    }

    const prediction = await response.json();
    res.json(prediction);
  } catch (error) {
    console.error('Ideogram API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Background Remover API proxy
app.post('/api/background-remover/generate', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_REPLICATE_API_KEY not configured' });
    }

    const response = await fetch('https://api.replicate.com/v1/models/cjwbw/rembg/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          image: imageUrl
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Background Remover API error: ${response.status}`);
    }

    const prediction = await response.json();
    res.json(prediction);
  } catch (error) {
    console.error('Background Remover API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lip Sync API proxy (using Wav2Lip or similar model)
app.post('/api/lipsync/generate', async (req, res) => {
  try {
    const { video_url, audio_url } = req.body;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_REPLICATE_API_KEY not configured' });
    }

    // Use Wav2Lip model via Replicate
    const response = await fetch('https://api.replicate.com/v1/models/devxpy/codeformer/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          video: video_url,
          audio: audio_url
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Lip sync API error: ${response.status}`);
    }

    const prediction = await response.json();
    res.json(prediction);
  } catch (error) {
    console.error('Lip sync API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lip sync polling endpoint
app.get('/api/lipsync/poll/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error('Failed to poll lip sync prediction status');
    }

    const pollData = await response.json();
    res.json(pollData);
  } catch (error) {
    console.error('Lip sync polling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TTS API proxy (using Bark or similar model)
app.post('/api/tts/generate', async (req, res) => {
  try {
    const { text, voice_id } = req.body;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_REPLICATE_API_KEY not configured' });
    }

    // Use Bark TTS model via Replicate
    const response = await fetch('https://api.replicate.com/v1/models/suno-ai/bark/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          prompt: text,
          text_temp: 0.7,
          waveform_temp: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    const prediction = await response.json();
    res.json(prediction);
  } catch (error) {
    console.error('TTS API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TTS polling endpoint
app.get('/api/tts/poll/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error('Failed to poll TTS prediction status');
    }

    const pollData = await response.json();
    res.json(pollData);
  } catch (error) {
    console.error('TTS polling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic Replicate polling endpoint
app.get('/api/replicate/poll/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const apiKey = process.env.VITE_REPLICATE_API_KEY;

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error('Failed to poll Replicate prediction status');
    }

    const pollData = await response.json();
    res.json(pollData);
  } catch (error) {
    console.error('Replicate polling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Segmind Fast Flux Schnell API proxy for image generation
// Segmind Nano Banana API proxy (replaces Fast Flux Schnell and Infinite You)
app.post('/api/segmind/nano-banana', async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, image_urls, aspect_ratio } = req.body;
    const apiKey = process.env.VITE_SEGMIND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_SEGMIND_API_KEY not configured' });
    }

    const requestBody = {
      prompt: prompt,
      ...(aspect_ratio ? { aspect_ratio } : {})
    };
    // Only include image_urls if caller provided any; support string or array transparently
    if (image_urls && ((Array.isArray(image_urls) && image_urls.length > 0) || typeof image_urls === 'string')) {
      requestBody.image_urls = Array.isArray(image_urls) ? image_urls : image_urls;
    }

    console.log('🍌 [NANO BANANA] Starting image generation');
    console.log('📤 [REQUEST] URL:', 'https://api.segmind.com/v1/nano-banana');
    console.log('📤 [REQUEST] Headers:', {
      'x-api-key': `${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    console.log('📤 [REQUEST] Body:', JSON.stringify({ ...requestBody, image_urls: requestBody.image_urls ? '[provided]' : undefined }, null, 2));

    const response = await fetch('https://api.segmind.com/v1/nano-banana', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [RESPONSE] Status:', response.status, response.statusText);
    console.log('📥 [RESPONSE] Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RESPONSE] Error Body:', errorText);
      
      // Log failed request
      activityLogger.log({
        endpoint: '/api/segmind/nano-banana',
        method: 'POST',
        requestBody: requestBody,
        responseStatus: response.status,
        responseBody: errorText,
        responseSize: errorText.length,
        duration: Date.now() - startTime,
        success: false
      });
      
      throw new Error(`Nano Banana API error: ${response.status} - ${errorText}`);
    }

    // Segmind returns image data directly
    const imageBuffer = await response.arrayBuffer();
    const fileUrl = await saveBufferAsJpegToGenerated(imageBuffer, 90);

    console.log('📥 [RESPONSE] Success - Image generated, size:', imageBuffer.byteLength, 'bytes');
    console.log('✅ [NANO BANANA] Generation completed successfully');
    
    // Log successful request
    activityLogger.log({
      endpoint: '/api/segmind/nano-banana',
      method: 'POST',
      requestBody: requestBody,
      responseStatus: response.status,
      responseBody: `Image generated (${imageBuffer.byteLength} bytes)`,
      responseSize: imageBuffer.byteLength,
      duration: Date.now() - startTime,
      success: true
    });
    
    const absolute = toAbsoluteUrl(req, fileUrl);
    res.json({ imageUrl: absolute });
  } catch (error) {
    console.error('❌ [NANO BANANA] Error:', error.message);
    
    // Log error
    activityLogger.log({
      endpoint: '/api/segmind/nano-banana',
      method: 'POST',
      requestBody: req.body,
      responseStatus: 500,
      responseBody: error.message,
      responseSize: error.message.length,
      duration: Date.now() - startTime,
      success: false
    });
    
    res.status(500).json({ error: error.message });
  }
});

// Segmind Consistent Character with Pose API proxy
app.post('/api/segmind/consistent-character-pose', async (req, res) => {
  const startTime = Date.now();
  try {
    const { face_image, pose_image, prompt, negative_prompt, width, height, steps, guidance_scale, seed, scheduler, image_format } = req.body;
    const apiKey = process.env.VITE_SEGMIND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_SEGMIND_API_KEY not configured' });
    }

    const requestBody = {
      face_image: face_image,
      pose_image: pose_image,
      prompt: prompt,
      negative_prompt: negative_prompt || "blurry, low quality, distorted, deformed",
      width: width || 1024,
      height: height || 1024,
      steps: steps || 25,
      guidance_scale: guidance_scale || 7.5,
      seed: seed || Math.floor(Math.random() * 1000000),
      scheduler: scheduler || "DPM++ 2M Karras",
      image_format: image_format || "jpeg"
    };

    console.log('🎭 [CONSISTENT CHARACTER] Starting character generation with pose');
    console.log('📤 [REQUEST] URL:', 'https://api.segmind.com/v1/consistent-character-with-pose');
    console.log('📤 [REQUEST] Headers:', {
      'x-api-key': `${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    console.log('📤 [REQUEST] Body:', JSON.stringify({
      ...requestBody,
      face_image: face_image ? `[base64 image data - ${face_image.length} chars]` : null,
      pose_image: pose_image ? `[base64 image data - ${pose_image.length} chars]` : null
    }, null, 2));

    const response = await fetch('https://api.segmind.com/v1/consistent-character-with-pose', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [RESPONSE] Status:', response.status, response.statusText);
    console.log('📥 [RESPONSE] Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RESPONSE] Error Body:', errorText);
      
      activityLogger.log({
        endpoint: '/api/segmind/consistent-character-pose',
        method: 'POST',
        requestBody: { ...requestBody, face_image: '[base64 data]', pose_image: '[base64 data]' },
        responseStatus: response.status,
        responseBody: errorText,
        responseSize: errorText.length,
        duration: Date.now() - startTime,
        success: false
      });
      
      throw new Error(`Consistent Character API error: ${response.status} - ${errorText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const fileUrl = await saveBufferAsJpegToGenerated(imageBuffer, 90);

    console.log('📥 [RESPONSE] Success - Character image generated, size:', imageBuffer.byteLength, 'bytes');
    console.log('✅ [CONSISTENT CHARACTER] Generation completed successfully');
    
    activityLogger.log({
      endpoint: '/api/segmind/consistent-character-pose',
      method: 'POST',
      requestBody: { ...requestBody, face_image: '[base64 data]', pose_image: '[base64 data]' },
      responseStatus: response.status,
      responseBody: `Character image generated (${imageBuffer.byteLength} bytes)`,
      responseSize: imageBuffer.byteLength,
      duration: Date.now() - startTime,
      success: true
    });
    
    const absolute = toAbsoluteUrl(req, fileUrl);
    res.json({ imageUrl: absolute });
  } catch (error) {
    console.error('❌ [CONSISTENT CHARACTER] Error:', error.message);
    
    activityLogger.log({
      endpoint: '/api/segmind/consistent-character-pose',
      method: 'POST',
      requestBody: req.body,
      responseStatus: 500,
      responseBody: error.message,
      responseSize: error.message.length,
      duration: Date.now() - startTime,
      success: false
    });
    
    res.status(500).json({ error: error.message });
  }
});

// Segmind SadTalker API proxy for lip sync
app.post('/api/segmind/sadtalker', async (req, res) => {
  const startTime = Date.now();
  try {
    const { input_image, input_audio, pose_style, expression_scale, preprocess, image_size, enhancer, base64 } = req.body;
    const apiKey = process.env.VITE_SEGMIND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_SEGMIND_API_KEY not configured' });
    }

    const requestBody = {
      input_image: input_image,
      input_audio: input_audio,
      pose_style: pose_style || 4,
      expression_scale: expression_scale || 1.4,
      preprocess: preprocess || "full",
      image_size: image_size || "256",
      enhancer: enhancer !== undefined ? enhancer : true,
      base64: base64 !== undefined ? base64 : true
    };

    console.log('🎬 [SADTALKER] Starting lip-sync video generation');
    console.log('📤 [REQUEST] URL:', 'https://api.segmind.com/v1/sadtalker');
    console.log('📤 [REQUEST] Headers:', {
      'x-api-key': `${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    console.log('📤 [REQUEST] Body:', JSON.stringify({
      ...requestBody,
      input_image: input_image ? `[base64 image data - ${input_image.length} chars]` : null,
      input_audio: input_audio ? `[base64 audio data - ${input_audio.length} chars]` : null
    }, null, 2));

    const response = await fetch('https://api.segmind.com/v1/sadtalker', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [RESPONSE] Status:', response.status, response.statusText);
    console.log('📥 [RESPONSE] Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RESPONSE] Error Body:', errorText);
      throw new Error(`SadTalker API error: ${response.status} - ${errorText}`);
    }

    // SadTalker returns video data directly
    const videoBuffer = await response.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64Video}`;

    console.log('📥 [RESPONSE] Success - Lip-sync video generated, size:', videoBuffer.byteLength, 'bytes');
    console.log('✅ [SADTALKER] Lip sync completed successfully');
    
    res.json({ videoUrl: dataUrl });
  } catch (error) {
    console.error('❌ [SADTALKER] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Segmind Seedance Lite i2v API proxy for video generation
app.post('/api/segmind/seedance-lite-i2v', async (req, res) => {
  try {
    const { image_url, duration, prompt, resolution, seed, camera_fixed } = req.body;
    const apiKey = process.env.VITE_SEGMIND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_SEGMIND_API_KEY not configured' });
    }

    const requestBody = {
      image_url: image_url,
      duration: duration || 10,
      prompt: prompt,
      resolution: resolution || "720p",
      seed: seed || Math.floor(Math.random() * 1000000),
      camera_fixed: camera_fixed !== undefined ? camera_fixed : true
    };

    console.log('🎥 [SEEDANCE LITE I2V] Starting image-to-video generation');
    console.log('📤 [REQUEST] URL:', 'https://api.segmind.com/v1/seedance-v1-lite-image-to-video');
    console.log('📤 [REQUEST] Headers:', {
      'x-api-key': `${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    console.log('📤 [REQUEST] Body:', JSON.stringify({
      ...requestBody,
      image_url: typeof image_url === 'string' && image_url.startsWith('data:') ? `[base64 image data - ${image_url.length} chars]` : image_url
    }, null, 2));

    const response = await fetch('https://api.segmind.com/v1/seedance-v1-lite-image-to-video', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [RESPONSE] Status:', response.status, response.statusText);
    console.log('📥 [RESPONSE] Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RESPONSE] Error Body:', errorText);
      throw new Error(`Seedance Lite i2v API error: ${response.status} - ${errorText}`);
    }

    // Seedance returns video data directly
    const videoBuffer = await response.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64Video}`;

    console.log('📥 [RESPONSE] Success - Video generated, size:', videoBuffer.byteLength, 'bytes');
    console.log('✅ [SEEDANCE LITE I2V] Generation completed successfully');
    
    res.json({ videoUrl: dataUrl });
  } catch (error) {
    console.error('❌ [SEEDANCE LITE I2V] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Segmind Chatterbox TTS API proxy
app.post('/api/segmind/chatterbox-tts', async (req, res) => {
  try {
    const { text, reference_audio, exaggeration, temperature, seed, cfg_weight, min_p, top_p, repetition_penalty } = req.body;
    const apiKey = process.env.VITE_SEGMIND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'VITE_SEGMIND_API_KEY not configured' });
    }

    console.log('🗣️ [CHATTERBOX TTS] Starting text-to-speech generation');
    console.log('📝 [TEXT] Input text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    console.log('🎵 [VOICE] Reference audio:', reference_audio);

    const requestBody = {
      text: text,
      reference_audio: reference_audio || 'https://segmind-resources.s3.amazonaws.com/input/ef2a2b5c-3e3a-4051-a437-20a72bf175de-sample_audio.mp3',
      exaggeration: exaggeration || 0.5,
      temperature: temperature || 0.8,
      seed: seed || Math.floor(Math.random() * 1000000),
      cfg_weight: cfg_weight || 0.5,
      min_p: min_p || 0.05,
      top_p: top_p || 1,
      repetition_penalty: repetition_penalty || 1.2
    };

    console.log('📤 [REQUEST] URL:', 'https://api.segmind.com/v1/chatterbox-tts');
    console.log('📤 [REQUEST] Headers:', {
      'x-api-key': `${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    console.log('📤 [REQUEST] Body:', JSON.stringify({
      ...requestBody,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    }, null, 2));

    const response = await fetch('https://api.segmind.com/v1/chatterbox-tts', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [RESPONSE] Status:', response.status, response.statusText);
    console.log('📥 [RESPONSE] Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RESPONSE] Error Body:', errorText);
      throw new Error(`Chatterbox TTS API error: ${response.status} - ${errorText}`);
    }

    // Chatterbox returns audio data directly
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const dataUrl = `data:audio/wav;base64,${base64Audio}`;

    console.log('📥 [RESPONSE] Success - Audio generated, size:', audioBuffer.byteLength, 'bytes');
    console.log('✅ [CHATTERBOX TTS] Generation completed successfully');
    
    res.json({ audioUrl: dataUrl });
  } catch (error) {
    console.error('❌ [CHATTERBOX TTS] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Admin client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Admin client disconnected:', socket.id);
  });
});

// Simple FFmpeg mux endpoint: combine audio + video, save to /generated/videos
app.post('/api/compose/mux', async (req, res) => {
  try {
    const { videoUrl, audioUrl, outName } = req.body || {};
    if (!videoUrl || !audioUrl) return res.status(400).json({ error: 'videoUrl and audioUrl are required' });

    const tmpDir = path.join(__dirname, 'tmp');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}

    const vIn = path.join(tmpDir, `in_${Date.now()}_v.mp4`);
    const aIn = path.join(tmpDir, `in_${Date.now()}_a.wav`);
    const out = path.join(GENERATED_VIDEOS_DIR, `${outName || `mux_${Date.now()}`}.mp4`);

    const writeFromUrl = async (url, p) => {
      if (typeof url === 'string' && url.startsWith('data:')) {
        const base64 = url.split(',')[1];
        fs.writeFileSync(p, Buffer.from(base64, 'base64'));
        return;
      }
      if (typeof url === 'string' && url.startsWith('/generated/')) {
        const rel = url.replace('/generated/', '');
        const abs = path.join(GENERATED_DIR, rel);
        fs.copyFileSync(abs, p);
        return;
      }
      const absolute = url.startsWith('http') ? url : `http://localhost:${PORT}${url}`;
      const r = await fetch(absolute);
      if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(p, b);
    };

    await writeFromUrl(videoUrl, vIn);
    await writeFromUrl(audioUrl, aIn);

    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', ['-y', '-i', vIn, '-i', aIn, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', out]);
      ff.on('error', reject);
      ff.on('close', (code) => code === 0 ? resolve(null) : reject(new Error(`ffmpeg exit ${code}`)));
    });

    try { fs.unlinkSync(vIn); fs.unlinkSync(aIn); } catch {}

    res.json({ muxedUrl: `/generated/videos/${path.basename(out)}` });
  } catch (e) {
    console.error('❌ [MUX] Exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// Snapshot first frame from a video into a PNG thumbnail
app.post('/api/compose/snapshot', async (req, res) => {
  try {
    const { videoUrl, outName } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

    const tmpDir = path.join(__dirname, 'tmp');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}

    const vIn = path.join(tmpDir, `snap_${Date.now()}.mp4`);
    const out = path.join(GENERATED_THUMBS_DIR, `${outName || `thumb_${Date.now()}`}.png`);

    const writeFromUrl = async (url, p) => {
      if (typeof url === 'string' && url.startsWith('/generated/')) {
        const rel = url.replace('/generated/', '');
        const abs = path.join(GENERATED_DIR, rel);
        fs.copyFileSync(abs, p);
        return;
      }
      const absolute = url.startsWith('http') ? url : `http://localhost:${PORT}${url}`;
      const r = await fetch(absolute);
      if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(p, b);
    };

    await writeFromUrl(videoUrl, vIn);

    await new Promise((resolve, reject) => {
      // Slight offset helps avoid blank first frame for some encoders
      const ff = spawn('ffmpeg', ['-y', '-ss', '0.05', '-i', vIn, '-frames:v', '1', '-q:v', '2', out]);
      ff.on('error', reject);
      ff.on('close', (code) => code === 0 ? resolve(null) : reject(new Error(`ffmpeg exit ${code}`)));
    });

    try { fs.unlinkSync(vIn); } catch {}

    res.json({ imageUrl: toAbsoluteUrl(req, `/generated/thumbnails/${path.basename(out)}`) });
  } catch (e) {
    console.error('❌ [SNAPSHOT] Exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// Concatenate multiple MP4s into one final MP4
app.post('/api/compose/concat', async (req, res) => {
  try {
    const { videos, outName } = req.body || {};
    if (!Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ error: 'videos must be a non-empty array' });
    }

    const tmpDir = path.join(__dirname, 'tmp');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}

    // Download/copy all parts to temp files
    const parts = [];
    const writeFromUrl = async (url, p) => {
      if (typeof url === 'string' && url.startsWith('data:')) {
        const base64 = url.split(',')[1];
        fs.writeFileSync(p, Buffer.from(base64, 'base64'));
        return;
      }
      if (typeof url === 'string' && url.startsWith('/generated/')) {
        const rel = url.replace('/generated/', '');
        const abs = path.join(GENERATED_DIR, rel);
        fs.copyFileSync(abs, p);
        return;
      }
      const absolute = url.startsWith('http') ? url : `http://localhost:${PORT}${url}`;
      const r = await fetch(absolute);
      if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(p, b);
    };

    for (let i = 0; i < videos.length; i++) {
      const p = path.join(tmpDir, `part_${Date.now()}_${i}.mp4`);
      await writeFromUrl(videos[i], p);
      parts.push(p);
    }

    // Build concat list file
    const listPath = path.join(tmpDir, `list_${Date.now()}.txt`);
    const listContent = parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const out = path.join(GENERATED_VIDEOS_DIR, `${outName || `final_${Date.now()}`}.mp4`);

    await new Promise((resolve, reject) => {
      // Re-encode for robustness (stream-copy often fails when tracks differ)
      const ff = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', out]);
      ff.on('error', reject);
      ff.on('close', (code) => code === 0 ? resolve(null) : reject(new Error(`ffmpeg exit ${code}`)));
    });

    // Cleanup temp
    try { fs.unlinkSync(listPath); parts.forEach(p => fs.unlinkSync(p)); } catch {}

    res.json({ finalUrl: `/generated/videos/${path.basename(out)}` });
  } catch (e) {
    console.error('❌ [CONCAT] Exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// OpenAI Sora video proxy
// Start a video render job
app.post('/api/sora/create', async (req, res) => {
  try {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'OPENAI API key not configured' });

    const { prompt, model = 'sora-2', seconds = 8, size = '1280x720', input_reference } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('model', model);
    form.append('seconds', String(seconds));
    form.append('size', size);
    if (input_reference) {
      // Support data URL or remote URL
      if (typeof input_reference === 'string' && input_reference.startsWith('data:')) {
        const base64 = input_reference.split(',')[1];
        const binary = Buffer.from(base64, 'base64');
        form.append('input_reference', new Blob([binary]), 'reference.png');
      } else {
        form.append('input_reference', input_reference);
      }
    }

    const r = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });

    const json = await r.json();
    if (!r.ok) {
      console.error('❌ [SORA CREATE] Error:', json);
      return res.status(r.status).json(json);
    }
    res.json(json);
  } catch (e) {
    console.error('❌ [SORA CREATE] Exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// Poll a job
app.get('/api/sora/status/:id', async (req, res) => {
  try {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const { id } = req.params;
    const r = await fetch(`https://api.openai.com/v1/videos/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const json = await r.json();
    if (!r.ok) return res.status(r.status).json(json);
    res.json(json);
  } catch (e) {
    console.error('❌ [SORA STATUS] Exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// Download and persist a completed video to server storage
app.get('/api/sora/download/:id', async (req, res) => {
  try {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const { id } = req.params;
    const outPath = path.join(GENERATED_VIDEOS_DIR, `${id}.mp4`);

    // If already exists, just return URL
    if (fs.existsSync(outPath)) {
      return res.json({ videoUrl: `/generated/videos/${id}.mp4` });
    }

    const r = await fetch(`https://api.openai.com/v1/videos/${id}/content`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    // Stream to file using Node streams
    const pipe = promisify(pipeline);
    await pipe(r.body, fs.createWriteStream(outPath));

    res.json({ videoUrl: `/generated/videos/${id}.mp4` });
  } catch (e) {
    console.error('❌ [SORA DOWNLOAD] Exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WTFX News Now Proxy Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
}); 
console.log(`🎬 Ready to proxy API calls for video generation!`);
