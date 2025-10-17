import { Story, GeneratedVideo, VideoSegment } from '../types';
import { idbSetJSON, idbGetJSON } from './idbStore';
import { AuthService } from './authService';
import { DriveService } from './driveService';

export interface StoredStory {
  id: string;
  story: Story;
  generatedVideo?: GeneratedVideo;
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress?: number;
}

export class StorageService {
  private readonly STORIES_KEY = 'wtfx_stories';
  private readonly CURRENT_STORY_KEY = 'wtfx_current_story';
  private readonly auth = new AuthService();
  private readonly drive = new DriveService();

  // Save a story to localStorage
  saveStory(storedStory: StoredStory): void {
    try {
      // Always persist to Drive when signed in
      (async () => {
        try { await this.drive.saveStory(storedStory.id, storedStory); } catch {}
      })();

      const stories = this.getAllStories();
      const existingIndex = stories.findIndex(s => s.id === storedStory.id);
      if (existingIndex >= 0) stories[existingIndex] = { ...storedStory, updatedAt: Date.now() };
      else stories.push({ ...storedStory, createdAt: Date.now(), updatedAt: Date.now() });
      localStorage.setItem(this.STORIES_KEY, JSON.stringify(stories));
    } catch (error) {
      console.error('Failed to save story:', error);
    }
  }

  // Get all stored stories
  getAllStories(): StoredStory[] {
    try {
      const stored = localStorage.getItem(this.STORIES_KEY);
      const local = stored ? JSON.parse(stored) : [];
      // If authenticated, fetch authoritative list from Drive async and refresh local cache
      (async () => {
        try {
          const list = await this.drive.listStories();
          if (Array.isArray(list) && list.length) {
            localStorage.setItem(this.STORIES_KEY, JSON.stringify(list));
            try { window.dispatchEvent(new CustomEvent('stories-updated')); } catch {}
          }
        } catch {}
      })();
      return local;
    } catch (error) {
      console.error('Failed to load stories:', error);
      return [];
    }
  }

  // Get a specific story by ID
  getStory(id: string): StoredStory | null {
    const stories = this.getAllStories();
    return stories.find(s => s.id === id) || null;
  }

  // Update story progress
  updateStoryProgress(id: string, progress: Partial<GeneratedVideo>): void {
    const story = this.getStory(id);
    if (story) {
      story.generatedVideo = { 
        story_id: story.story.story_id,
        title: story.story.title,
        segments: [],
        status: 'generating',
        progress: 0,
        ...story.generatedVideo, 
        ...progress 
      };
      story.updatedAt = Date.now();
      this.saveStory(story);
    }
  }

  // Delete a story
  deleteStory(id: string): void {
    const stories = this.getAllStories();
    const filtered = stories.filter(s => s.id !== id);
    localStorage.setItem(this.STORIES_KEY, JSON.stringify(filtered));
    (async () => { try { await this.drive.deleteStory(id); } catch {} })();
  }

  // Save current story being worked on
  saveCurrentStory(storedStory: StoredStory): void {
    try {
      localStorage.setItem(this.CURRENT_STORY_KEY, JSON.stringify(storedStory));
    } catch (error) {
      console.error('Failed to save current story:', error);
    }
  }

  // Get current story being worked on
  getCurrentStory(): StoredStory | null {
    try {
      const stored = localStorage.getItem(this.CURRENT_STORY_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load current story:', error);
      return null;
    }
  }

  // Clear current story
  clearCurrentStory(): void {
    localStorage.removeItem(this.CURRENT_STORY_KEY);
  }

  // Save video segment data (for larger files, use IndexedDB)
  async saveVideoSegment(storyId: string, segmentId: string, data: any): Promise<void> {
    try {
      const key = `video_segment_${storyId}_${segmentId}`;
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        // Fallback to IndexedDB if localStorage quota is exceeded
        await idbSetJSON(key, data);
      }
      try {
        // Notify UI that a segment has updated so components can refresh posters/thumbnails
        window.dispatchEvent(new CustomEvent('segment-updated', { detail: { storyId, segmentId, data } }));
      } catch {}
    } catch (error) {
      console.error('Failed to save video segment:', error);
    }
  }

  // Get video segment data
  getVideoSegment(storyId: string, segmentId: string): any {
    try {
      const key = `video_segment_${storyId}_${segmentId}`;
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
      // Try IndexedDB
      // Note: IndexedDB APIs are async; here we expose sync interface by returning a placeholder and notifying via event when loaded.
      // For ease, callers generally only need preview URL; we’ll kick an async fetch and dispatch the same update event.
      (async () => {
        try {
          const value = await idbGetJSON<any>(key);
          if (value) {
            try { window.dispatchEvent(new CustomEvent('segment-updated', { detail: { storyId, segmentId, data: value } })); } catch {}
          }
        } catch {}
      })();
      return null;
    } catch (error) {
      console.error('Failed to load video segment:', error);
      return null;
    }
  }

  // Download a file from URL
  async downloadFile(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error('Download failed');
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: number; total: number; percentage: number } {
    try {
      const used = new Blob([localStorage.getItem(this.STORIES_KEY) || '']).size;
      const total = 5 * 1024 * 1024; // 5MB typical localStorage limit
      return {
        used,
        total,
        percentage: (used / total) * 100
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  // Clean up old stories (keep last 10)
  cleanupOldStories(): void {
    const stories = this.getAllStories();
    if (stories.length > 10) {
      const sorted = stories.sort((a, b) => b.updatedAt - a.updatedAt);
      const toKeep = sorted.slice(0, 10);
      localStorage.setItem(this.STORIES_KEY, JSON.stringify(toKeep));
    }
  }
} 
