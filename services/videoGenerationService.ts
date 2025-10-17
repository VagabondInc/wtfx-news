import { 
  VideoSegment, 
  GeneratedVideo, 
  VideoGenerationProgress,
  Story 
} from '../types';
import { StorageService } from './storageService';
import { CharacterService } from './characterService';
import { DownloadService } from './downloadService';

const PROXY_BASE_URL = 'http://localhost:3001';

export class VideoGenerationService {
  private progressCallback?: (progress: VideoGenerationProgress) => void;
  private storageService = new StorageService();
  private characterService = new CharacterService();
  private downloadService = new DownloadService();

  constructor() {
    // Ensure character data (images and tags) are loaded for reference images
    try {
      this.characterService.loadCharacterData();
    } catch {}
  }

  setProgressCallback(callback: (progress: VideoGenerationProgress) => void) {
    this.progressCallback = callback;
  }

  private updateProgress(progress: Partial<VideoGenerationProgress>) {
    if (this.progressCallback) {
      this.progressCallback(progress as VideoGenerationProgress);
    }
  }

  async generateVideo(story: Story): Promise<GeneratedVideo> {
    const videoSegments: VideoSegment[] = story.segments.map(segment => ({
      ...segment,
      status: 'pending' as const,
    }));

    const generatedVideo: GeneratedVideo = {
      story_id: story.story_id,
      title: story.title,
      segments: videoSegments,
      status: 'generating',
      progress: 0,
    };

    // Save initial state
    this.storageService.saveCurrentStory({
      id: story.story_id,
      story,
      generatedVideo,
      status: 'generating',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    try {
      // Step 1: Generate videos with Sora (on-camera + b-roll)
      await this.generateAllSoraVideos(generatedVideo);
      
      // Step 2: Generate lower third graphics
      await this.generateLowerThirdGraphics(generatedVideo);
      
      // Step 3: Generate TTS audio for voiceover segments only
      await this.generateVoiceoverAudio(generatedVideo);
      
      // Step 4: Compose per-segment audio over video where needed
      await this.composeFinalVideo(generatedVideo);

      generatedVideo.status = 'completed';
      generatedVideo.progress = 100;

      // Download all assets automatically
      await this.downloadService.downloadStoryAssets(story.story_id, generatedVideo);

      // Save final state
      this.storageService.updateStoryProgress(story.story_id, generatedVideo);

      return generatedVideo;
    } catch (error) {
      generatedVideo.status = 'error';
      generatedVideo.error = error instanceof Error ? error.message : 'Unknown error';
      this.storageService.updateStoryProgress(story.story_id, generatedVideo);
      throw error;
    }
  }

  // Generate all videos using OpenAI Sora (text-to-video, with audio)
  private async generateAllSoraVideos(video: GeneratedVideo): Promise<void> {
    this.updateProgress({ currentStep: 'Generating videos with Sora', progress: 15, totalSteps: 4 });
    
    // Process on-camera segments (studio, field reporter, witness)
    const onCameraSegments = video.segments.filter(s => 
      s.id.includes('studio') || s.id.includes('field_reporter') || s.id.includes('witness')
    );
    
    // Process b-roll segments (these have visual_description)
    const brollSegments = video.segments.filter(s => 
      s.type === 'runway' && s.visual_description && !s.dialog
    );
    
    // Generate on-camera videos (studio and similar) with dialog embedded
    for (const segment of onCameraSegments) {
      segment.status = 'generating';
      
      try {
        console.log(`🎬 Generating on-camera video for ${segment.id}`);
        const { videoPrompt } = this.createOnCameraVideoPrompt(segment);

        // Build a Sora-friendly prompt that includes dialog to speak
        const dialog = (segment.dialog || '').trim();
        const speakPart = dialog
          ? ` Include clearly spoken anchor audio reading this script verbatim with natural pacing and broadcast delivery: "${dialog.replace(/"/g, '\"')}".`
          : '';

        const fullPrompt = `${videoPrompt}.${speakPart}`;

        // Use character reference image if available to guide identity
        const refImage = segment.character
          ? (this.characterService.getCharacterImageUrl(segment.character) || undefined)
          : undefined;

        const videoUrl = await this.callSoraVideoAPI(fullPrompt, Math.max(6, Math.min(12, segment.duration || 10)), refImage);
        segment.videoUrl = videoUrl;
        segment.status = 'completed';
        
        // Download video immediately
        await this.downloadService.downloadAndSaveAsset(videoUrl, 'video', {
          storyId: video.story_id,
          segmentId: segment.id
        });
        
        // Create and save thumbnail (first frame)
        try {
          const snapResp = await fetch(`${PROXY_BASE_URL}/api/compose/snapshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl, outName: `${video.story_id}_${segment.id}` })
          });
          if (snapResp.ok) {
            const { imageUrl } = await snapResp.json();
            (segment as any).firstFrameImageUrl = imageUrl;
            await this.downloadService.downloadAndSaveAsset(imageUrl, 'image', {
              storyId: video.story_id,
              segmentId: segment.id,
              customFileName: `${segment.id}-first-frame`
            });
          }
        } catch {}

        // Save segment immediately (including thumbnail if present)
        await this.storageService.saveVideoSegment(video.story_id, segment.id, {
          videoUrl,
          firstFrameImageUrl: (segment as any).firstFrameImageUrl,
          status: 'completed'
        });
        
        // Update progress
        this.storageService.updateStoryProgress(video.story_id, video);
        
      } catch (error) {
        segment.status = 'error';
        segment.error = error instanceof Error ? error.message : 'Sora generation failed';
        console.error(`❌ Sora generation failed for ${segment.id}:`, error);
      }
    }
    
    // Generate b-roll videos
    for (const segment of brollSegments) {
      segment.status = 'generating';
      
      try {
        console.log(`🎬 Generating b-roll video for ${segment.id}`);
        const videoUrl = await this.callSoraVideoAPI(segment.visual_description!, Math.max(5, Math.min(10, segment.duration || 5)));
        segment.videoUrl = videoUrl;
        segment.status = 'completed';
        
        // Download b-roll video immediately
        await this.downloadService.downloadAndSaveAsset(videoUrl, 'video', {
          storyId: video.story_id,
          segmentId: segment.id
        });
        
        // Create and save thumbnail (first frame)
        try {
          const snapResp = await fetch(`${PROXY_BASE_URL}/api/compose/snapshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl, outName: `${video.story_id}_${segment.id}` })
          });
          if (snapResp.ok) {
            const { imageUrl } = await snapResp.json();
            (segment as any).firstFrameImageUrl = imageUrl;
            await this.downloadService.downloadAndSaveAsset(imageUrl, 'image', {
              storyId: video.story_id,
              segmentId: segment.id,
              customFileName: `${segment.id}-first-frame`
            });
          }
        } catch {}

        await this.storageService.saveVideoSegment(video.story_id, segment.id, {
          videoUrl,
          firstFrameImageUrl: (segment as any).firstFrameImageUrl,
          status: 'completed'
        });
        
      } catch (error) {
        segment.status = 'error';
        segment.error = error instanceof Error ? error.message : 'Sora generation failed';
        console.error(`❌ Sora b-roll generation failed for ${segment.id}:`, error);
      }
    }
  }

  private createOnCameraImagePrompt(segment: VideoSegment): { imagePrompt: string; referenceImages: string[] } {
    const cameraDescription = (segment as any).camera_description || 'medium shot';
    
    let basePrompt = '';
    const name = segment.character || '';
    const knownChar = name ? this.characterService.getCharacterByName(name) : undefined;
    const mention = knownChar ? knownChar.tag : name; // Use @tag when known, else plain name
    if (segment.id.includes('studio')) {
      basePrompt = `${mention} welcomes viewers to tonight's broadcast. He sits at an over the top local TV news studio desk, with extravagant city skyline miniature model in a cyclorama background behind him. There are blue and red lights lighting the background from different angles creating an interesting background effect. ${mention} is well lit with studio lights and has minimal shadows on his face. He occasionally makes gestures with his hands while telling the top headline. He looks directly into the camera, addressing the viewer. The camera is static, with a slight zoom in.`;
    } else if (segment.id.includes('field_reporter')) {
      basePrompt = `${mention} is on the scene of a breaking news story. Outdoor location with natural lighting, ${cameraDescription}, speaking confidently to camera with professional demeanor, holding microphone, professional field reporter setup, high definition`;
    } else if (segment.id.includes('witness')) {
      basePrompt = `${mention} is being interviewed about the incident. Indoor interview setting with soft lighting, ${cameraDescription}, speaking earnestly to off-camera interviewer, high definition`;
    } else {
      basePrompt = `${mention} appears in frame, ${cameraDescription}, professional video quality`;
    }
    
    // Process the prompt to replace @character tags and get reference images
    const { prompt: processedPrompt, referenceImages } = this.characterService.processPromptWithTags(basePrompt);
    
    console.log(`📸 Generated image prompt for ${segment.id}: ${processedPrompt}`);
    console.log(`🖼️ Reference images for ${segment.id}: ${referenceImages.length} images`);
    
    return { 
      imagePrompt: processedPrompt,
      referenceImages 
    };
  }

  private createOnCameraVideoPrompt(segment: VideoSegment): { videoPrompt: string } {
    let videoPrompt = '';
    if (segment.id.includes('studio')) {
      videoPrompt = 'The news anchor speaks to camera, making subtle hand gestures, slight head movements, professional broadcast delivery, static camera with slight zoom in, 10 seconds';
    } else if (segment.id.includes('field_reporter')) {
      videoPrompt = 'Field reporter speaks confidently to camera, slight body movement, professional reporting stance, outdoor lighting, 10 seconds';
    } else if (segment.id.includes('witness')) {
      videoPrompt = 'Person speaks earnestly during interview, natural conversational movements, soft indoor lighting, 10 seconds';
    } else {
      videoPrompt = 'Person speaks to camera, natural movements, professional video quality, 10 seconds';
    }
    
    console.log(`🎥 Generated video prompt for ${segment.id}: ${videoPrompt}`);
    
    return { videoPrompt };
  }

  // Removed Runway helpers; using Sora instead
  private async callSoraVideoAPI(description: string, duration: number = 8, inputReference?: string): Promise<string> {
    const payload: any = { prompt: description, model: 'sora-2', seconds: duration, size: '1280x720' };
    if (inputReference) payload.input_reference = inputReference;

    // Create job
    const createResp = await fetch(`${PROXY_BASE_URL}/api/sora/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!createResp.ok) {
      const e = await createResp.text();
      throw new Error(`Sora create failed: ${e}`);
    }
    const job = await createResp.json();
    const id = job.id;
    if (!id) throw new Error('No Sora job id');

    // Poll
    let status = job.status || 'queued';
    while (status === 'queued' || status === 'in_progress') {
      await new Promise(r => setTimeout(r, 4000));
      const pr = await fetch(`${PROXY_BASE_URL}/api/sora/status/${id}`);
      const js = await pr.json();
      if (!pr.ok) throw new Error(`Sora status failed: ${JSON.stringify(js)}`);
      status = js.status;
    }
    if (status !== 'completed') {
      throw new Error(`Sora job failed (status=${status})`);
    }
    const dl = await fetch(`${PROXY_BASE_URL}/api/sora/download/${id}`);
    if (!dl.ok) throw new Error(`Sora download failed: ${await dl.text()}`);
    const { videoUrl } = await dl.json();
    return videoUrl;
  }

  

  private async generateTTSFromText(text: string, character: string): Promise<string> {
    try {
      console.log(`🗣️ Generating TTS for character: ${character}`);
      
      // Character voice mapping to local audio files
      const voiceMapping: { [key: string]: string } = {
        'Dana Kingsley': 'female-anchor.wav',    // Female anchor
        'Ron Tate': 'male-anchor.wav',           // Male anchor  
        'Max Fields': 'male-reporter.wav',       // Male reporter
        'default_female': 'female-reporter.wav'  // Default female reporter
      };

      // Get voice file based on character or default
      const voiceFile = voiceMapping[character] || voiceMapping['default_female'];

      const response = await fetch(`${PROXY_BASE_URL}/api/segmind/chatterbox-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          reference_audio: `http://localhost:3001/audio/${voiceFile}`,
          exaggeration: 0.5,
          temperature: 0.8,
          seed: Math.floor(Math.random() * 1000000),
          cfg_weight: 0.5,
          min_p: 0.05,
          top_p: 1,
          repetition_penalty: 1.2
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate TTS: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.audioUrl;
    } catch (error) {
      console.error('❌ TTS generation failed:', error);
      throw error;
    }
  }

  private async callLipSyncAPI(videoUrl: string, audioUrl: string): Promise<string> {
    try {
      console.log('🎬 Applying lip sync with SadTalker');
      
      const response = await fetch(`${PROXY_BASE_URL}/api/segmind/sadtalker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input_image: videoUrl,
          input_audio: audioUrl,
          pose_style: 4,
          expression_scale: 1.4,
          preprocess: "full",
          image_size: "256",
          enhancer: true,
          base64: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to apply lip sync: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.videoUrl;
    } catch (error) {
      console.error('❌ Lip sync failed:', error);
      throw error;
    }
  }

  // Generate lower third graphics
  private async generateLowerThirdGraphics(video: GeneratedVideo): Promise<void> {
    this.updateProgress({ currentStep: 'Generating lower third graphics', progress: 60, totalSteps: 7 });
    
    const segmentsWithLowerThirds = video.segments.filter(s => s.lower_third);
    
    for (const segment of segmentsWithLowerThirds) {
      try {
        const response = await fetch(`${PROXY_BASE_URL}/api/ideogram/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ lowerThird: segment.lower_third })
        });

        if (response.ok) {
          const prediction = await response.json();
          // Poll for completion and get the image URL
          // For now, set a placeholder
          segment.lowerThirdUrl = 'https://via.placeholder.com/400x100/ef4444/ffffff?text=' + 
            encodeURIComponent(segment.lower_third?.header || '');
        }
      } catch (error) {
        console.error(`Failed to generate lower third for ${segment.id}:`, error);
      }
    }
  }

  // Remove backgrounds from lower thirds
  private async removeLowerThirdBackgrounds(video: GeneratedVideo): Promise<void> {
    this.updateProgress({ currentStep: 'Removing lower third backgrounds', progress: 75, totalSteps: 7 });
    
    const segmentsWithLowerThirds = video.segments.filter(s => s.lowerThirdUrl);
    
    for (const segment of segmentsWithLowerThirds) {
      try {
        const response = await fetch(`${PROXY_BASE_URL}/api/background-remover/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ imageUrl: segment.lowerThirdUrl })
        });

        if (response.ok) {
          // For now, keep the same URL
          // In a real implementation, you'd poll for the background-removed image
        }
      } catch (error) {
        console.error(`Failed to remove background from ${segment.id}:`, error);
      }
    }
  }

  // Generate TTS audio for voiceover segments
  private async generateVoiceoverAudio(video: GeneratedVideo): Promise<void> {
    this.updateProgress({ currentStep: 'Generating TTS voiceover audio', progress: 85, totalSteps: 7 });
    
    const voiceoverSegments = video.segments.filter(s => s.type === 'tts_voiceover');
    
    for (const segment of voiceoverSegments) {
      segment.status = 'generating';
      
      try {
        const audioUrl = await this.generateTTSFromText(
          (segment as any).voiceover_script!, 
          segment.character!
        );
        segment.audioUrl = audioUrl;
        segment.status = 'completed';
        
        await this.storageService.saveVideoSegment(video.story_id, segment.id, {
          audioUrl,
          status: 'completed'
        });
        
      } catch (error) {
        segment.status = 'error';
        segment.error = error instanceof Error ? error.message : 'TTS generation failed';
        console.error(`Failed to generate TTS for ${segment.id}:`, error);
      }
    }
  }

  // Compose final video
  private async composeFinalVideo(video: GeneratedVideo): Promise<void> {
    this.updateProgress({ currentStep: 'Composing final video', progress: 95, totalSteps: 4 });

    // 1) Per-segment mux (when segment has separate audio)
    for (const segment of video.segments) {
      if (segment.videoUrl && segment.audioUrl) {
        try {
          const resp = await fetch(`${PROXY_BASE_URL}/api/compose/mux`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoUrl: segment.videoUrl,
              audioUrl: segment.audioUrl,
              outName: `${video.story_id}_${segment.id}`
            })
          });
          if (resp.ok) {
            const { muxedUrl } = await resp.json();
            segment.videoUrl = muxedUrl;
          }
        } catch (e) {
          console.warn('Mux failed for segment', segment.id, e);
        }
      }
    }

    // 2) Concat all completed segment videos into a final MP4
    const orderedVideos = video.segments
      .map(s => s.videoUrl)
      .filter((u): u is string => typeof u === 'string' && u.length > 0);

    if (orderedVideos.length > 0) {
      try {
        const concatResp = await fetch(`${PROXY_BASE_URL}/api/compose/concat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videos: orderedVideos, outName: `final_${video.story_id}` })
        });
        if (concatResp.ok) {
          const { finalUrl } = await concatResp.json();
          video.finalVideoUrl = finalUrl;
        } else {
          // Fallback to last segment if concat failed
          const last = [...video.segments].reverse().find(s => s.videoUrl);
          if (last?.videoUrl) video.finalVideoUrl = last.videoUrl;
        }
      } catch (e) {
        console.warn('Concat failed; using last segment as final', e);
        const last = [...video.segments].reverse().find(s => s.videoUrl);
        if (last?.videoUrl) video.finalVideoUrl = last.videoUrl;
      }
    }
  }
}
