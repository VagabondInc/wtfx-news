
import React, { useEffect, useMemo, useState } from 'react';
import { Segment } from '../types';
import { StorageService } from '../services/storageService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { PlayIcon } from './icons/PlayIcon';
import { MicIcon } from './icons/MicIcon';
import { BrollIcon } from './icons/BrollIcon';

interface SegmentCardProps {
  segment: Segment;
  index: number;
  storyId: string;
}

const SegmentTypePill: React.FC<{ type: Segment['type'] }> = ({ type }) => {
    const typeStyles = {
        veo3: {
            icon: <PlayIcon />,
            text: 'On-Camera',
            className: 'bg-red-500/20 text-red-300 border-red-500/30',
        },
        runway: {
            icon: <BrollIcon />,
            text: 'B-Roll',
            className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        },
        tts_voiceover: {
            icon: <MicIcon />,
            text: 'Voiceover',
            className: 'bg-green-500/20 text-green-300 border-green-500/30',
        }
    };

    const { icon, text, className } = typeStyles[type] || {};

    return (
        <div className={`absolute top-3 right-3 flex items-center space-x-2 px-2 py-1 text-xs font-semibold rounded-full border ${className} backdrop-blur-sm`}>
            {icon}
            <span>{text}</span>
        </div>
    );
};

const LowerThirdDisplay: React.FC<{ segment: Segment }> = ({ segment }) => {
    if (!segment.lower_third) return null;
    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="bg-blue-900/80 border-l-4 border-blue-400 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
                <h4 className="font-bold text-base">{segment.lower_third.header}</h4>
                <p className="text-sm text-slate-300">{segment.lower_third.subheader}</p>
            </div>
        </div>
    )
}

export const SegmentCard: React.FC<SegmentCardProps> = ({ segment, index, storyId }) => {
  const isVideo = segment.type === 'veo3' || segment.type === 'runway';
  const animationDelay = `${index * 75}ms`;
  const storageService = new StorageService();
  const [poster, setPoster] = useState<string | undefined>(undefined);

  // Derive a deterministic server thumbnail path as a fallback
  const serverThumb = useMemo(() => `/generated/thumbnails/${storyId}_${segment.id}.png`, [storyId, segment.id]);

  useEffect(() => {
    // Initial load from storage
    try {
      const saved = storageService.getVideoSegment(storyId, segment.id);
      if (saved?.firstFrameImageUrl) setPoster(`${saved.firstFrameImageUrl}?t=${Date.now()}`);
      else if (saved?.previewImageUrl) setPoster(`${saved.previewImageUrl}?t=${Date.now()}`);
      else {
        // Try server-side thumbnail path only if it exists
        fetch(serverThumb, { method: 'HEAD' })
          .then((r) => { if (r.ok) setPoster(`${serverThumb}?t=${Date.now()}`); })
          .catch(() => {});
      }
    } catch {}

    // Listen to custom segment updates
    const onUpdate = (e: any) => {
      const { storyId: sId, segmentId: segId, data } = e.detail || {};
      if (sId === storyId && segId === segment.id) {
        if (data?.firstFrameImageUrl) setPoster(`${data.firstFrameImageUrl}?t=${Date.now()}`);
        else if (data?.previewImageUrl) setPoster(`${data.previewImageUrl}?t=${Date.now()}`);
      }
    };
    window.addEventListener('segment-updated', onUpdate as EventListener);

    // Optional: listen to storage changes (another tab/window)
    const onStorage = () => {
      const saved2 = storageService.getVideoSegment(storyId, segment.id);
      if (saved2?.firstFrameImageUrl) setPoster(`${saved2.firstFrameImageUrl}?t=${Date.now()}`);
      else if (saved2?.previewImageUrl) setPoster(`${saved2.previewImageUrl}?t=${Date.now()}`);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('segment-updated', onUpdate as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [storyId, segment.id]);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col animate-slide-in-up" style={{ animationDelay }}>
        {isVideo ? (
            <div className="relative aspect-video bg-slate-700">
                {poster ? (
                  <>
                    <img src={poster} alt={segment.visual_description || 'Video segment'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                          <PlayIcon className="h-8 w-8 text-white"/>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner className="w-10 h-10 text-white" />
                  </div>
                )}
                <SegmentTypePill type={segment.type} />
                <LowerThirdDisplay segment={segment} />
            </div>
        ) : (
            <div className="relative p-5 bg-slate-900/50">
                <SegmentTypePill type={segment.type} />
                <div className="flex items-center space-x-3">
                    <div className="text-green-400">
                        <MicIcon className="w-8 h-8"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">{segment.character}</h3>
                        <p className="text-sm text-slate-400">{segment.role}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="p-5 flex-grow">
            {segment.dialog && <p className="italic text-slate-200">"{segment.dialog}"</p>}
            {segment.visual_description && (
                <div>
                    <h4 className="font-bold text-slate-400 text-sm mt-2">VISUAL</h4>
                    <p className="text-slate-300">{segment.visual_description}</p>
                </div>
            )}
            {segment.voiceover_script && <p className="italic text-slate-200">"{segment.voiceover_script}"</p>}
            {segment.camera_description && <p className="text-xs text-slate-500 mt-4 font-mono">🎥 {segment.camera_description}</p>}
        </div>

        <div className="bg-slate-900/50 text-right px-4 py-2 border-t border-slate-700">
            <span className="text-xs font-mono text-slate-500">ID: {segment.id} | Dur: {segment.duration}s</span>
        </div>
    </div>
  );
};
