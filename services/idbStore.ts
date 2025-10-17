// Minimal IndexedDB helper for blobs and JSON KV
// Stores:
// - 'blobs': { key: string, value: Blob }
// - 'kv': { key: string, value: any }

const DB_NAME = 'wtfx-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSetJSON<T = any>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetJSON<T = any>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result ? (req.result as any).value as T : null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDeleteJSON(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbPutBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ key, value: blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(key);
    req.onsuccess = () => resolve(req.result ? (req.result as any).value as Blob : null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDeleteBlob(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetBlobUrl(key: string): Promise<string | null> {
  const blob = await idbGetBlob(key);
  return blob ? URL.createObjectURL(blob) : null;
}

