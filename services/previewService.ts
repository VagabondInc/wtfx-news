import { Story, Segment } from '../types';
import { StorageService } from './storageService';
import { CharacterService } from './characterService';
import { DownloadService } from './downloadService';

const PROXY_BASE_URL = 'http://localhost:3001';

export class PreviewService {
  private storage = new StorageService();
  private characters = new CharacterService();
  private downloader = new DownloadService();

  async generatePreviews(story: Story): Promise<void> {
    try { this.characters.loadCharacterData(); } catch {}

    const tasks: Promise<void>[] = [];
    for (const seg of story.segments) {
      if (seg.type === 'tts_voiceover') continue; // audio-only
      tasks.push(this.generatePreviewForSegment(story.story_id, seg));
    }
    // Fire-and-forget but do not block UI
    Promise.allSettled(tasks).then(() => {}).catch(() => {});
  }

  private async generatePreviewForSegment(storyId: string, segment: Segment): Promise<void> {
    try {
      const existing = this.storage.getVideoSegment(storyId, segment.id);
      if (existing?.firstFrameImageUrl || existing?.previewImageUrl) return;

      let imageUrl: string | undefined;

      if (segment.type === 'runway' && segment.visual_description) {
        // B-roll preview via Nano Banana (16:9). Use default reference.
        const resp = await fetch(`${PROXY_BASE_URL}/api/segmind/nano-banana`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: segment.visual_description, aspect_ratio: '16:9' })
        });
        if (resp.ok) {
          const json = await resp.json();
          imageUrl = json.imageUrl as string;
        }
      } else {
        // On-camera preview via Nano Banana with character headshots as references
        const cameraText = segment.camera_description || 'medium shot, straight-on camera';
        const { prompt: processedPrompt, referenceImages } = this.characters.processPromptWithTags(
          `${segment.character || 'Person'} on camera, professional TV news studio, ${cameraText}, well-lit, neutral white balance, 16:9 composition`
        );
        const resp = await fetch(`${PROXY_BASE_URL}/api/segmind/nano-banana`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: processedPrompt, ...(referenceImages.length ? { image_urls: referenceImages } : {}), aspect_ratio: '16:9' })
        });
        if (resp.ok) {
          const json = await resp.json();
          imageUrl = json.imageUrl as string;
        }
      }

      if (imageUrl) {
        try {
          await this.downloader.downloadAndSaveAsset(imageUrl, 'image', {
            storyId,
            segmentId: segment.id,
            customFileName: `${segment.id}-preview`
          });
        } catch {}
        await this.storage.saveVideoSegment(storyId, segment.id, {
          previewImageUrl: imageUrl,
          status: 'pending'
        });
      }
    } catch (e) {
      // Non-fatal; leave spinner
      console.warn('Preview generation failed for', segment.id, e);
    }
  }
}
