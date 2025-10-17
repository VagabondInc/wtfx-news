export interface LowerThird {
  header: string;
  subheader: string;
}

export interface Segment {
  id: string;
  type: 'veo3' | 'runway' | 'tts_voiceover';
  duration: number;
  character?: string;
  role?: string;
  camera_description?: string;
  dialog?: string;
  lower_third?: LowerThird;
  voiceover_script?: string;
  visual_description?: string;
  audio_voiceover?: string;
}

export interface Story {
  story_id: string;
  title: string;
  duration_seconds: number;
  segments: Segment[];
}

export interface VideoSegment {
  id: string;
  type: 'veo3' | 'runway' | 'tts_voiceover';
  duration: number;
  videoUrl?: string;
  audioUrl?: string;
  firstFrameImageUrl?: string;
  previewImageUrl?: string;
  lowerThirdUrl?: string;
  character?: string;
  role?: string;
  dialog?: string;
  voiceover_script?: string;
  visual_description?: string;
  lower_third?: LowerThird;
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

export interface GeneratedVideo {
  story_id: string;
  title: string;
  segments: VideoSegment[];
  finalVideoUrl?: string;
  status: 'generating' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export interface Veo3Response {
  id: string;
  status: string;
  output?: string[];
  error?: string;
}

export interface RunwayResponse {
  id: string;
  status: string;
  output?: string[];
  error?: string;
}

export interface IdeogramResponse {
  id: string;
  status: string;
  output?: string[];
  error?: string;
}

export interface BackgroundRemoverResponse {
  id: string;
  status: string;
  output?: string;
  error?: string;
}

export interface ChatterboxResponse {
  id: string;
  status: string;
  output?: string;
  error?: string;
}

export interface AudioExtractionResult {
  audioUrl: string;
  duration: number;
  sampleRate: number;
}

export interface VoiceCloneResult {
  voiceId: string;
  audioUrl: string;
  duration: number;
}

export interface VideoGenerationProgress {
  currentStep: string;
  progress: number;
  totalSteps: number;
  currentSegment?: string;
}
