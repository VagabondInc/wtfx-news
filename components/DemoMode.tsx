import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { PlayIcon } from './icons/PlayIcon';

interface DemoModeProps {
  onExitDemo: () => void;
}

export const DemoMode: React.FC<DemoModeProps> = ({ onExitDemo }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const demoSteps = [
    {
      title: "🎬 Generating Veo3 Videos",
      description: "Creating on-camera anchor and reporter segments",
      icon: "🎥",
      duration: 3000,
      details: [
        "Studio intro with Dana Kingsley",
        "Field reporter Max Fields on location",
        "Witness interview with Becky Holloway",
        "Studio outro with Ron Tate"
      ]
    },
    {
      title: "🎵 Extracting Audio Samples",
      description: "Processing voice samples for cloning",
      icon: "🎤",
      duration: 2000,
      details: [
        "Extracting audio from Veo3 segments",
        "Processing voice characteristics",
        "Preparing for voice cloning"
      ]
    },
    {
      title: "🎤 Creating Voice Clones",
      description: "Generating AI voice replicas",
      icon: "🤖",
      duration: 4000,
      details: [
        "Cloning Dana Kingsley's voice",
        "Cloning Max Fields' voice",
        "Cloning Becky Holloway's voice",
        "Voice quality optimization"
      ]
    },
    {
      title: "📹 Generating B-Roll Footage",
      description: "Creating background video segments",
      icon: "🎬",
      duration: 3500,
      details: [
        "Roomba spinning in hallway",
        "Dark guest room footage",
        "Googly eyes close-up",
        "Suburban street pan",
        "Garden gnome tear shot"
      ]
    },
    {
      title: "🎨 Creating Lower Third Graphics",
      description: "Generating professional news graphics",
      icon: "🎨",
      duration: 2500,
      details: [
        "Headline graphics",
        "Anchor name plates",
        "Location indicators",
        "Witness identification"
      ]
    },
    {
      title: "✂️ Removing Backgrounds",
      description: "Processing graphics for overlay",
      icon: "🖼️",
      duration: 2000,
      details: [
        "Background removal from graphics",
        "Alpha channel processing",
        "Edge refinement"
      ]
    },
    {
      title: "🗣️ Generating TTS Audio",
      description: "Creating voice-cloned narration",
      icon: "🎧",
      duration: 3000,
      details: [
        "Voice-cloned field reporter narration",
        "Voice-cloned witness narration",
        "Audio synchronization"
      ]
    },
    {
      title: "🎭 Composing Final Video",
      description: "Assembling complete news broadcast",
      icon: "🎬",
      duration: 4000,
      details: [
        "Video segment assembly",
        "Audio synchronization",
        "Lower third overlay",
        "Final rendering"
      ]
    }
  ];

  const startDemo = () => {
    setIsGenerating(true);
    setCurrentStep(0);
    setProgress(0);
  };

  useEffect(() => {
    if (!isGenerating) return;

    const step = demoSteps[currentStep];
    if (!step) {
      setIsGenerating(false);
      return;
    }

    const stepProgress = (progress / step.duration) * 100;
    const stepInterval = step.duration / 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + stepInterval;
        if (newProgress >= step.duration) {
          if (currentStep < demoSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
            setProgress(0);
          } else {
            setIsGenerating(false);
          }
          return 0;
        }
        return newProgress;
      });
    }, stepInterval);

    return () => clearInterval(timer);
  }, [isGenerating, currentStep, progress, demoSteps]);

  const currentStepData = demoSteps[currentStep];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Demo Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full px-6 py-2 mb-4">
          <span className="text-purple-300 text-sm font-medium">🎭</span>
          <span className="text-purple-200 text-sm font-medium">DEMO MODE</span>
          <span className="text-purple-300 text-sm font-medium">🎭</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          WTFX News Now - Video Generation Demo
        </h2>
        <p className="text-slate-400 text-lg">
          Experience the full $5M grant extravagance in action
        </p>
      </div>

      {/* Demo Controls */}
      {!isGenerating && (
        <div className="text-center mb-8">
          <button
            onClick={startDemo}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 btn-extravagant"
          >
            <PlayIcon className="w-6 h-6 mr-3" />
            Start Demo Generation
          </button>
          <button
            onClick={onExitDemo}
            className="ml-4 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Exit Demo
          </button>
        </div>
      )}

      {/* Progress Display */}
      {isGenerating && currentStepData && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{currentStepData.icon}</div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {currentStepData.title}
                </h3>
                <p className="text-slate-400">{currentStepData.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">
                Step {currentStep + 1} of {demoSteps.length}
              </div>
              <div className="text-sm text-slate-400">
                {Math.round((currentStep / demoSteps.length) * 100)}% Complete
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Step Progress</span>
              <span>{Math.round((progress / currentStepData.duration) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4">
              <div 
                className="h-4 rounded-full progress-extravagant"
                style={{ width: `${(progress / currentStepData.duration) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentStepData.details.map((detail, index) => (
              <div 
                key={index}
                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 news-segment"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-300">{detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo Complete */}
      {!isGenerating && currentStep === demoSteps.length && (
        <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-700 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Demo Generation Complete!
          </h3>
          <p className="text-slate-300 mb-6">
            You've just witnessed the full WTFX News Now video generation pipeline in action.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🎥</div>
              <div className="text-sm text-slate-300">Veo3 Videos Generated</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🎤</div>
              <div className="text-sm text-slate-300">Voice Clones Created</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-sm text-slate-300">Graphics Processed</div>
            </div>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={startDemo}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all duration-300"
            >
              Run Demo Again
            </button>
            <button
              onClick={onExitDemo}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      {/* Feature Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h4 className="text-lg font-bold text-white mb-2">AI Story Generation</h4>
          <p className="text-sm text-slate-400">Powered by Google Gemini</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🎬</div>
          <h4 className="text-lg font-bold text-white mb-2">Veo3 Video Creation</h4>
          <p className="text-sm text-slate-400">Professional on-camera segments</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🎤</div>
          <h4 className="text-lg font-bold text-white mb-2">Voice Cloning</h4>
          <p className="text-sm text-slate-400">Chatterbox-powered synthesis</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🎨</div>
          <h4 className="text-lg font-bold text-white mb-2">Dynamic Graphics</h4>
          <p className="text-sm text-slate-400">Ideogram-generated lower thirds</p>
        </div>
      </div>
    </div>
  );
}; 