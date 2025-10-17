import { AuthService } from './authService';

export class DriveService {
  private auth = new AuthService();
  private static queue: Array<() => Promise<any>> = [];
  private static active = 0;
  private static readonly maxConcurrent = 2;
  private static async runNext() {
    if (DriveService.active >= DriveService.maxConcurrent) return;
    const job = DriveService.queue.shift();
    if (!job) return;
    DriveService.active++;
    try { await job(); } finally {
      DriveService.active--;
      // small pacing delay to respect API rate limits
      setTimeout(() => { void DriveService.runNext(); }, 200);
    }
  }
  private static enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      DriveService.queue.push(async () => {
        try { resolve(await fn()); }
        catch (e) { reject(e as any); }
      });
      void DriveService.runNext();
    });
  }

  async ensureAuth(): Promise<boolean> {
    const st = await this.auth.fetchStatus();
    return !!st.authenticated;
  }

  async uploadBlob(name: string, mimeType: string, folder: 'images'|'audio'|'videos'|'segments'|'stories', blob: Blob): Promise<any> {
    const ok = await this.ensureAuth();
    if (!ok) return null;
    return DriveService.enqueue(async () => {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(blob);
      });
      const resp = await fetch('http://localhost:3001/drive/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mimeType, folder, dataUrl })
      });
      return resp.ok ? await resp.json() : Promise.reject(await resp.text().catch(() => 'Upload failed'));
    });
  }

  async uploadFromUrl(name: string, mimeType: string, folder: 'images'|'audio'|'videos', url: string): Promise<any> {
    const ok = await this.ensureAuth();
    if (!ok) return null;
    return DriveService.enqueue(async () => {
      const resp = await fetch('http://localhost:3001/drive/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mimeType, folder, url })
      });
      return resp.ok ? await resp.json() : Promise.reject(await resp.text().catch(() => 'Upload failed'));
    });
  }

  async saveStory(storyId: string, storedStory: any): Promise<void> {
    const ok = await this.ensureAuth();
    if (!ok) return;
    await fetch('http://localhost:3001/drive/save-story', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, storedStory })
    });
  }

  async listStories(): Promise<any[]> {
    const ok = await this.ensureAuth();
    if (!ok) return [];
    const resp = await fetch('http://localhost:3001/drive/stories', { credentials: 'include' });
    return resp.ok ? await resp.json() : [];
  }

  async deleteStory(storyId: string): Promise<void> {
    const ok = await this.ensureAuth();
    if (!ok) return;
    await fetch(`http://localhost:3001/drive/story/${storyId}`, { method: 'DELETE', credentials: 'include' });
  }

  async saveKV(name: string, data: any, folder: 'stories'|'images'|'audio'|'videos'|'segments' = 'stories'): Promise<void> {
    const ok = await this.ensureAuth();
    if (!ok) return;
    await fetch('http://localhost:3001/drive/kv/set', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data, folder })
    });
  }

  async getKV<T = any>(name: string, folder: 'stories'|'images'|'audio'|'videos'|'segments' = 'stories'): Promise<T | null> {
    const ok = await this.ensureAuth();
    if (!ok) return null;
    const resp = await fetch(`http://localhost:3001/drive/kv/get?name=${encodeURIComponent(name)}&folder=${encodeURIComponent(folder)}`, { credentials: 'include' });
    if (!resp.ok) return null;
    return await resp.json();
  }
}
