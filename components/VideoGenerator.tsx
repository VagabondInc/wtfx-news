import React, { useState, useCallback } from 'react';
import { VideoGenerationService } from '../services/videoGenerationService';
import { StorageService } from '../services/storageService';
import { Story, GeneratedVideo, VideoGenerationProgress } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { LoadingSpinner } from './icons/LoadingSpinner';

interface VideoGeneratorProps {
  story: Story;
  onVideoGenerated: (video: GeneratedVideo) => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ story, onVideoGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<VideoGenerationProgress | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoService = new VideoGenerationService();
  const storageService = new StorageService();

  const handleGenerateVideo = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setGeneratedVideo(null);

    videoService.setProgressCallback((progress) => {
      setProgress(progress);
    });

    try {
      const video = await videoService.generateVideo(story);
      setGeneratedVideo(video);
      onVideoGenerated(video);
    } catch (err) {
      console.error('Video generation failed:', err);
      setError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [story, onVideoGenerated]);

  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      await storageService.downloadFile(url, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  }, []);

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStepIcon = (step: string) => {
    if (step.includes('Veo3')) return '🎥';
    if (step.includes('audio')) return '🎵';
    if (step.includes('voice')) return '🎤';
    if (step.includes('B-roll')) return '📹';
    if (step.includes('graphics')) return '🎨';
    if (step.includes('background')) return '✂️';
    if (step.includes('TTS')) return '🗣️';
    if (step.includes('final')) return '🎬';
    return '⚙️';
  };

  const getFileExtension = (url: string, type: string) => {
    if (type === 'video') return '.mp4';
    if (type === 'audio') return '.wav';
    if (type === 'image') return '.png';
    return '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Generate Button */}
      {!isGenerating && !generatedVideo && (
        <div className="text-center mb-8">
          <button
            onClick={handleGenerateVideo}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <PlayIcon className="w-6 h-6 mr-3" />
            Generate News Video
          </button>
          <p className="mt-4 text-slate-400 text-sm">
            Create a complete news broadcast with AI-generated videos, graphics, and voice cloning
          </p>
        </div>
      )}

      {/* Progress Display */}
      {isGenerating && progress && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <LoadingSpinner className="w-5 h-5 mr-3" />
              {progress.currentStep}
            </h3>
            <span className="text-2xl">{getStepIcon(progress.currentStep)}</span>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Progress</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress.progress)}`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          <div className="text-sm text-slate-400">
            Step {Math.ceil(progress.progress / 12.5)} of {progress.totalSteps}
            {progress.currentSegment && (
              <span className="ml-2">• {progress.currentSegment}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-xl mb-8">
          <h3 className="font-bold text-lg mb-2">Video Generation Failed</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={handleGenerateVideo}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Generated Video Display */}
      {generatedVideo && generatedVideo.status === 'completed' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">🎬 News Video Generated!</h3>
            <span className="text-green-400 text-sm">✓ Complete</span>
          </div>
          
          {/* Final Video */}
          <div className="aspect-video bg-slate-900 rounded-lg mb-6 flex items-center justify-center">
            {generatedVideo.finalVideoUrl ? (
              <div className="relative w-full h-full">
                <video 
                  controls 
                  className="w-full h-full rounded-lg"
                  src={generatedVideo.finalVideoUrl}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => handleDownload(generatedVideo.finalVideoUrl!, `${generatedVideo.title}_final_video.mp4`)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg shadow-lg transition-colors"
                  >
                    📥 Download Final Video
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-center">
                <div className="text-4xl mb-2">🎥</div>
                <p>Final video composition in progress...</p>
                <p className="text-sm">Check the generated segments below</p>
              </div>
            )}
          </div>

          {/* Individual Segments */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-white mb-4">📹 Individual Segments</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedVideo.segments.map((segment) => (
                <div 
                  key={segment.id}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">
                      {segment.id.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      segment.status === 'completed' ? 'bg-green-600 text-green-100' :
                      segment.status === 'error' ? 'bg-red-600 text-red-100' :
                      'bg-yellow-600 text-yellow-100'
                    }`}>
                      {segment.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-400 mb-3">
                    {segment.type} • {segment.duration}s
                  </div>

                  {/* Download buttons for each asset */}
                  <div className="space-y-2">
                    {segment.videoUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">📹 Video</span>
                        <button
                          onClick={() => handleDownload(segment.videoUrl!, `${segment.id}_video${getFileExtension(segment.videoUrl!, 'video')}`)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    )}
                    
                    {segment.audioUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-400">🎵 Audio</span>
                        <button
                          onClick={() => handleDownload(segment.audioUrl!, `${segment.id}_audio${getFileExtension(segment.audioUrl!, 'audio')}`)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    )}
                    
                    {segment.lowerThirdUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-purple-400">🎨 Graphics</span>
                        <button
                          onClick={() => handleDownload(segment.lowerThirdUrl!, `${segment.id}_graphic${getFileExtension(segment.lowerThirdUrl!, 'image')}`)}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    )}

                    {segment.error && (
                      <div className="text-xs text-red-400 mt-1">
                        Error: {segment.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Download Options */}
          <div className="border-t border-slate-600 pt-6">
            <h4 className="text-lg font-bold text-white mb-4">📦 Bulk Downloads</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  generatedVideo.segments.forEach(segment => {
                    if (segment.videoUrl) {
                      handleDownload(segment.videoUrl, `${segment.id}_video.mp4`);
                    }
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                📹 Download All Videos
              </button>
              
              <button
                onClick={() => {
                  generatedVideo.segments.forEach(segment => {
                    if (segment.audioUrl) {
                      handleDownload(segment.audioUrl, `${segment.id}_audio.wav`);
                    }
                  });
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                🎵 Download All Audio
              </button>
              
              <button
                onClick={() => {
                  generatedVideo.segments.forEach(segment => {
                    if (segment.lowerThirdUrl) {
                      handleDownload(segment.lowerThirdUrl, `${segment.id}_graphic.png`);
                    }
                  });
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                🎨 Download All Graphics
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleGenerateVideo}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Generate New Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 