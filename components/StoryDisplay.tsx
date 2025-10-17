
import React from 'react';
import { Story } from '../types';
import { SegmentCard } from './SegmentCard';

interface StoryDisplayProps {
  story: Story;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ story }) => {
  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up">
      {/* Breaking News Banner */}
      <div className="breaking-banner text-center py-2 mb-6 rounded-lg">
        <span className="text-white font-bold text-lg">🚨 BREAKING NEWS 🚨</span>
      </div>
      
      <div className="text-center mb-10 border-b-2 border-slate-700 pb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-blue-300 animate-typewriter">
          {story.title}
        </h2>
        <p className="mt-2 text-slate-400 animate-pulse">Total Story Duration: {story.duration_seconds}s</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {story.segments.map((segment, index) => (
          <div 
            key={segment.id}
            className="animate-fade-in-up news-card"
            style={{ animationDelay: `${0.1 * (index + 1)}s` }}
          >
            <SegmentCard segment={segment} index={index} storyId={story.story_id} />
          </div>
        ))}
      </div>
    </div>
  );
};
