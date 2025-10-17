interface DownloadedAsset {
  originalUrl: string;
  localPath: string;
  fileName: string;
  type: 'image' | 'video' | 'audio';
  storyId?: string;
  characterId?: string;
  segmentId?: string;
  downloadedAt: number;
  fileSize?: number;
}

import { idbPutBlob, idbDeleteBlob } from './idbStore';
import { DriveService } from './driveService';
import { AuthService } from './authService';

export class DownloadService {
  private downloadedAssets: Map<string, DownloadedAsset> = new Map();
  private downloadQueue: Set<string> = new Set();
  private static directoriesInitialized = false;
  private drive = new DriveService();
  private auth = new AuthService();

  constructor() {
    this.loadDownloadedAssets();
    // Initialize download directories only once per app session
    if (!DownloadService.directoriesInitialized) {
      this.createDownloadsDirectory();
      DownloadService.directoriesInitialized = true;
    }
  }

  private createDownloadsDirectory(): void {
    // Create downloads structure
    const basePath = 'downloads';
    const folders = [
      'downloads/characters',
      'downloads/videos', 
      'downloads/audio',
      'downloads/images',
      'downloads/stories'
    ];
    
    // In a real Electron app, you'd use fs.mkdirSync
    // For now, we'll track the structure
    console.log('📁 Download directories ready:', folders);
  }

  private loadDownloadedAssets(): void {
    const stored = localStorage.getItem('downloaded-assets');
    if (stored) {
      try {
        const assets = JSON.parse(stored);
        this.downloadedAssets = new Map(assets);
      } catch (error) {
        console.error('Failed to load downloaded assets:', error);
      }
    }
  }

  private saveDownloadedAssets(): void {
    // Keep only most recent 150 entries to avoid localStorage bloat
    const entries = Array.from(this.downloadedAssets.entries())
      .sort((a, b) => (b[1].downloadedAt || 0) - (a[1].downloadedAt || 0))
      .slice(0, 150);
    try {
      localStorage.setItem('downloaded-assets', JSON.stringify(entries));
    } catch (e) {
      // If still too big, aggressively trim
      const trimmed = entries.slice(0, 50);
      try { localStorage.setItem('downloaded-assets', JSON.stringify(trimmed)); } catch {}
    }
  }

  async downloadAndSaveAsset(
    url: string, 
    type: 'image' | 'video' | 'audio',
    metadata?: {
      storyId?: string;
      characterId?: string;
      segmentId?: string;
      customFileName?: string;
    }
  ): Promise<string> {
    // Check if already downloaded
    if (this.downloadedAssets.has(url)) {
      const asset = this.downloadedAssets.get(url)!;
      console.log('📋 Asset already downloaded:', asset.localPath);
      return asset.localPath;
    }

    // Check if currently downloading
    if (this.downloadQueue.has(url)) {
      console.log('⏳ Asset already in download queue:', url);
      return url; // Return original URL for now
    }

    this.downloadQueue.add(url);

    try {
      // Normalize local server paths to absolute URL
      const fetchUrl = url.startsWith('/generated/')
        ? `${location.protocol}//${location.hostname}:${3001}${url}`
        : url;
      console.log(`📥 Downloading ${type}:`, fetchUrl);

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const fileName = this.generateFileName(type, metadata);
      // Avoid storing large videos; persist images/audio to IndexedDB
      const localPath = type === 'video'
        ? url // For videos, keep remote URL reference
        : await this.saveToIndexedDB(blob, fileName, type);

      const asset: DownloadedAsset = {
        originalUrl: url,
        localPath,
        fileName,
        type,
        storyId: metadata?.storyId,
        characterId: metadata?.characterId,
        segmentId: metadata?.segmentId,
        downloadedAt: Date.now(),
        fileSize: blob.size
      };

      this.downloadedAssets.set(url, asset);
      this.saveDownloadedAssets();

      // If signed in, mirror to Drive
      try {
        const folder = type === 'image' ? 'images' : type === 'audio' ? 'audio' : 'videos';
        if (type === 'video') {
          await this.drive.uploadFromUrl(fileName, 'video/mp4', 'videos', fetchUrl);
        } else if (type === 'image') {
          // Prefer server/file URL upload to avoid base64 payloads
          if (fetchUrl.startsWith('http')) {
            await this.drive.uploadFromUrl(fileName, 'image/jpeg', 'images', fetchUrl);
          } else {
            await this.drive.uploadBlob(fileName, 'image/jpeg', 'images', blob);
          }
        } else if (type === 'audio') {
          await this.drive.uploadBlob(fileName, 'audio/wav', 'audio', blob);
        }
      } catch {}

      console.log(`✅ ${type} saved:`, localPath);
      return localPath;

    } catch (error) {
      console.error(`❌ Failed to download ${type}:`, error);
      throw error;
    } finally {
      this.downloadQueue.delete(url);
    }
  }

  private generateFileName(
    type: 'image' | 'video' | 'audio',
    metadata?: {
      storyId?: string;
      characterId?: string;
      segmentId?: string;
      customFileName?: string;
    }
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(type);

    if (metadata?.customFileName) {
      return `${metadata.customFileName}.${extension}`;
    }

    if (metadata?.characterId) {
      return `character-${metadata.characterId}-${timestamp}.${extension}`;
    }

    if (metadata?.storyId && metadata?.segmentId) {
      return `story-${metadata.storyId}-segment-${metadata.segmentId}-${timestamp}.${extension}`;
    }

    if (metadata?.storyId) {
      return `story-${metadata.storyId}-${type}-${timestamp}.${extension}`;
    }

    return `${type}-${timestamp}.${extension}`;
  }

  private getFileExtension(type: 'image' | 'video' | 'audio'): string {
    switch (type) {
      case 'image': return 'jpg';
      case 'video': return 'mp4';
      case 'audio': return 'wav';
      default: return 'bin';
    }
  }

  private async saveToIndexedDB(blob: Blob, fileName: string, type: string): Promise<string> {
    const storageKey = `download-${type}-${fileName}`;
    try {
      await idbPutBlob(storageKey, blob);
    } catch (e) {
      console.warn(`⚠️ IndexedDB save error for ${storageKey}:`, (e as any)?.message || e);
    }
    const localPath = `downloads/${type}s/${fileName}`;
    return localPath;
  }

  // Get local file data URL for display (sync). If not found synchronously, caller should fall back to remote URL.
  getLocalFileUrl(localPath: string): string | null {
    const fileName = localPath.split('/').pop();
    if (!fileName) return null;
    
    const type = localPath.includes('/images/') ? 'image' : 
                localPath.includes('/videos/') ? 'video' : 
                localPath.includes('/audio/') ? 'audio' : 'image';
    
    const storageKey = `download-${type}-${fileName}`;

    // Legacy localStorage DataURL if present (sync)
    const dataUrl = localStorage.getItem(storageKey);
    if (dataUrl) return dataUrl;
    // Optionally, we could asynchronously resolve from IndexedDB and dispatch an event
    // without blocking the UI. For now, just return null and let caller use remote URL.
    return null;
  }

  // Download all assets for a story
  async downloadStoryAssets(storyId: string, generatedVideo: any): Promise<void> {
    console.log(`📦 Downloading all assets for story: ${storyId}`);

    const downloadPromises: Promise<void>[] = [];

    // Download final video
    if (generatedVideo.finalVideoUrl) {
      downloadPromises.push(
        this.downloadAndSaveAsset(generatedVideo.finalVideoUrl, 'video', {
          storyId,
          customFileName: `final-video-${storyId}`
        }).then(() => {})
      );
    }

    // Download all segment assets
    for (const segment of generatedVideo.segments) {
      // Video files
      if (segment.videoUrl) {
        downloadPromises.push(
          this.downloadAndSaveAsset(segment.videoUrl, 'video', {
            storyId,
            segmentId: segment.id
          }).then(() => {})
        );
      }

      // Lip sync videos
      if ((segment as any).lipSyncVideoUrl) {
        downloadPromises.push(
          this.downloadAndSaveAsset((segment as any).lipSyncVideoUrl, 'video', {
            storyId,
            segmentId: segment.id,
            customFileName: `${segment.id}-lipsync`
          }).then(() => {})
        );
      }

      // Audio files
      if (segment.audioUrl) {
        downloadPromises.push(
          this.downloadAndSaveAsset(segment.audioUrl, 'audio', {
            storyId,
            segmentId: segment.id
          }).then(() => {})
        );
      }

      // Lower third graphics
      if (segment.lowerThirdUrl) {
        downloadPromises.push(
          this.downloadAndSaveAsset(segment.lowerThirdUrl, 'image', {
            storyId,
            segmentId: segment.id,
            customFileName: `${segment.id}-lower-third`
          }).then(() => {})
        );
      }
    }

    try {
      await Promise.allSettled(downloadPromises);
      console.log(`✅ All assets downloaded for story: ${storyId}`);
    } catch (error) {
      console.error(`❌ Error downloading story assets:`, error);
    }
  }

  // Download character images
  async downloadCharacterAssets(characterId: string, imageUrl: string): Promise<string> {
    console.log(`👤 Downloading character asset for ${characterId} from ${imageUrl}`);
    const localPath = await this.downloadAndSaveAsset(imageUrl, 'image', {
      characterId,
      customFileName: `character-${characterId}`
    });
    console.log(`✅ Character asset downloaded to: ${localPath}`);
    return localPath;
  }

  // Get download statistics
  getDownloadStats(): {
    totalAssets: number;
    totalSize: number;
    byType: Record<string, number>;
    oldestDownload: number | null;
    newestDownload: number | null;
  } {
    const assets = Array.from(this.downloadedAssets.values());
    
    return {
      totalAssets: assets.length,
      totalSize: assets.reduce((sum, asset) => sum + (asset.fileSize || 0), 0),
      byType: assets.reduce((counts, asset) => {
        counts[asset.type] = (counts[asset.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>),
      oldestDownload: assets.length > 0 ? Math.min(...assets.map(a => a.downloadedAt)) : null,
      newestDownload: assets.length > 0 ? Math.max(...assets.map(a => a.downloadedAt)) : null
    };
  }

  // Clean up old downloads (optional)
  cleanupOldDownloads(daysOld: number = 30): void {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const assetsToRemove: string[] = [];

    for (const [url, asset] of this.downloadedAssets.entries()) {
      if (asset.downloadedAt < cutoffTime) {
        // Remove from local caches
        const fileName = asset.localPath.split('/').pop();
        const type = asset.type;
        const storageKey = `download-${type}-${fileName}`;
        localStorage.removeItem(storageKey);
        try { void idbDeleteBlob(storageKey); } catch {}
        
        assetsToRemove.push(url);
      }
    }

    assetsToRemove.forEach(url => this.downloadedAssets.delete(url));
    this.saveDownloadedAssets();

    console.log(`🧹 Cleaned up ${assetsToRemove.length} old downloads`);
  }

  // Export download list
  exportDownloadList(): string {
    const assets = Array.from(this.downloadedAssets.values());
    return JSON.stringify(assets, null, 2);
  }

  // Manual download with progress
  async downloadWithProgress(
    url: string,
    type: 'image' | 'video' | 'audio',
    onProgress?: (loaded: number, total: number) => void
  ): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      if (onProgress && total > 0) {
        onProgress(loaded, total);
      }
    }

    const blob = new Blob(chunks);
    const fileName = this.generateFileName(type);
    return await this.saveToIndexedDB(blob, fileName, type);
  }
}
