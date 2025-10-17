import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { StoryGenerator } from './components/StoryGenerator';
import { StoryDisplay } from './components/StoryDisplay';
import { VideoGenerator } from './components/VideoGenerator';
import { NewsTeam } from './components/NewsTeam';
import { DownloadStatus } from './components/DownloadStatus';
import { StationOnboarding } from './components/StationOnboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { generateNewsStory } from './services/geminiService';
import { StorageService, StoredStory } from './services/storageService';
import { CharacterService } from './services/characterService';
import { DownloadService } from './services/downloadService';
import { StationService } from './services/stationService';
import { PreviewService } from './services/previewService';
import { Story, GeneratedVideo } from './types';
import { Footer } from './components/Footer';
import { SignIn } from './components/SignIn';
import { AuthService } from './services/authService';

function App() {
  const [story, setStory] = useState<Story | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStories, setSavedStories] = useState<StoredStory[]>([]);
  const [showSavedStories, setShowSavedStories] = useState<boolean>(false);
  const [charactersReady, setCharactersReady] = useState<boolean>(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [auth, setAuth] = useState<{ authenticated: boolean; user?: any }>({ authenticated: false });

  const storageService = new StorageService();
  const characterService = new CharacterService();
  const downloadService = new DownloadService();
  const stationService = new StationService();
  const authService = new AuthService();

  // Load saved stories and check character status on app start
  useEffect(() => {
    // Require sign-in first
    authService.fetchStatus().then((st) => {
      setAuth(st);
    });

    const stories = storageService.getAllStories();
    setSavedStories(stories);

    // Check for current story in progress
    const currentStory = storageService.getCurrentStory();
    if (currentStory && currentStory.status === 'generating') {
      setStory(currentStory.story);
      setGeneratedVideo(currentStory.generatedVideo || null);
    }

    // Check if station is onboarded and characters are ready
    const onboarded = stationService.isUserOnboarded();
    setIsOnboarded(onboarded);
    
    if (onboarded) {
      characterService.loadCharacterData();
      setCharactersReady(characterService.areCharacterImagesReady());
    }
  }, []);

  const handleCharactersGenerated = useCallback(() => {
    setCharactersReady(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    console.log('🚀 Onboarding completion callback triggered!');
    console.log('📊 Setting isOnboarded to true...');
    setIsOnboarded(true);
    
    console.log('📂 Loading character data...');
    characterService.loadCharacterData();
    const charactersReady = characterService.areCharacterImagesReady();
    console.log('👥 Characters ready:', charactersReady);
    setCharactersReady(charactersReady);
    
    console.log('✅ Onboarding complete, should show main UI now');
  }, []);

  const handleGenerateStory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStory(null);
    setGeneratedVideo(null);
    
    try {
      const newStory = await generateNewsStory();
      setStory(newStory);
      // Immediately kick off preview image generation (non-blocking)
      try {
        const preview = new PreviewService();
        preview.generatePreviews(newStory);
      } catch {}
      
      // Save new story
      const storedStory: StoredStory = {
        id: newStory.story_id,
        story: newStory,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      storageService.saveStory(storedStory);
      storageService.saveCurrentStory(storedStory);
      
      // Update saved stories list
      setSavedStories(storageService.getAllStories());
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check the console and ensure your API key is set.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVideoGenerated = useCallback((video: GeneratedVideo) => {
    setGeneratedVideo(video);
    
    // Update stored story with video
    if (story) {
      const storedStory: StoredStory = {
        id: story.story_id,
        story,
        generatedVideo: video,
        status: video.status === 'completed' ? 'completed' : 'generating',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      storageService.saveStory(storedStory);
      
      if (video.status === 'completed') {
        storageService.clearCurrentStory();
      }
      
      setSavedStories(storageService.getAllStories());
    }
  }, [story]);

  const handleLoadStory = useCallback((storedStory: StoredStory) => {
    setStory(storedStory.story);
    setGeneratedVideo(storedStory.generatedVideo || null);
    storageService.saveCurrentStory(storedStory);
    setShowSavedStories(false);
  }, []);

  const handleDeleteStory = useCallback((storyId: string) => {
    storageService.deleteStory(storyId);
    setSavedStories(storageService.getAllStories());
    
    // If deleted story is current, clear it
    if (story?.story_id === storyId) {
      setStory(null);
      setGeneratedVideo(null);
      storageService.clearCurrentStory();
    }
  }, [story]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Show onboarding if not onboarded
  if (!auth.authenticated) {
    return <SignIn />;
  }

  if (!isOnboarded) {
    try {
      return <StationOnboarding onOnboardingComplete={handleOnboardingComplete} />;
    } catch (error) {
      console.error('StationOnboarding error:', error);
      return (
        <div className="min-h-screen bg-red-600 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Onboarding Error</h1>
            <p className="text-gray-700 mb-4">There was an error loading the onboarding screen.</p>
            <button 
              onClick={() => setIsOnboarded(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Skip to Main App
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 font-sans flex flex-col">
        <Header stationBranding={stationService.getStationBranding()} />
        {/* User badge */}
        <div className="container mx-auto px-4 md:px-8 pt-2 text-right text-slate-400 text-sm">
          Signed in {auth.user?.email ? `as ${auth.user.email}` : ''}
        </div>
      
      {/* Saved Stories Toggle */}
      <div className="container mx-auto px-4 md:px-8 pt-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowSavedStories(!showSavedStories)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            📚 Saved Stories ({savedStories.length})
          </button>
          
          {savedStories.length > 0 && (
            <div className="text-xs text-slate-400">
              Storage: {Math.round(storageService.getStorageInfo().percentage)}% used
            </div>
          )}
        </div>

        {/* Saved Stories List */}
        {showSavedStories && (
          <div className="mb-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">📚 Saved Stories</h3>
            
            {savedStories.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No saved stories yet. Generate your first story!</p>
            ) : (
              <div className="space-y-4">
                {savedStories.map((savedStory) => (
                  <div
                    key={savedStory.id}
                    className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">
                          {savedStory.story.title}
                        </h4>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>Created: {formatDate(savedStory.createdAt)}</div>
                          <div>Updated: {formatDate(savedStory.updatedAt)}</div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              savedStory.status === 'completed' ? 'bg-green-600 text-green-100' :
                              savedStory.status === 'generating' ? 'bg-yellow-600 text-yellow-100' :
                              savedStory.status === 'error' ? 'bg-red-600 text-red-100' :
                              'bg-slate-600 text-slate-100'
                            }`}>
                              {savedStory.status}
                            </span>
                            {savedStory.generatedVideo && (
                              <span className="text-blue-400">
                                {savedStory.generatedVideo.segments.filter(s => s.status === 'completed').length} / {savedStory.generatedVideo.segments.length} segments
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleLoadStory(savedStory)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          {savedStory.status === 'generating' ? 'Resume' : 'View'}
                        </button>
                        <button
                          onClick={() => handleDeleteStory(savedStory.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
        <StoryGenerator 
          onGenerate={handleGenerateStory} 
          isLoading={isLoading}
          characterService={characterService}
          charactersReady={charactersReady}
          onCharactersGenerated={handleCharactersGenerated}
        />
        
        {/* News Team Display - Removed individual sections, now integrated in header */}
        
        {error && (
          <div className="mt-8 w-full max-w-4xl bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg animate-fade-in">
            <h3 className="font-bold text-lg">Generation Failed</h3>
            <p className="mt-2">{error}</p>
          </div>
        )}
        
        {story && !isLoading && (
          <div className="mt-8 w-full animate-fade-in">
            <StoryDisplay story={story} />
          </div>
        )}
        
        {story && !isLoading && !error && (
          <div className="mt-8 w-full animate-fade-in">
            <VideoGenerator story={story} onVideoGenerated={handleVideoGenerated} />
          </div>
        )}
        
        {!story && !isLoading && !error && !showSavedStories && (
          <div className="mt-16 text-center animate-fade-in-up">
            {/* Call to Action Section */}
            <div className="mb-8 text-center">
              <div className="inline-block bg-gradient-to-r from-slate-800 to-slate-700 p-8 rounded-xl border border-slate-600 shadow-2xl animate-glow-pulse">
                <p className="text-3xl md:text-4xl font-bold text-white mb-4 animate-typewriter">
                  GIVE ME THE NEWS.
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-red-500 mx-auto mb-4 animate-pulse"></div>
                <p className="text-slate-300 text-lg animate-fade-in-up" style={{ animationDelay: '1s' }}>
                  The {stationService.getStationBranding()?.name || 'WTFX News Now'} AI producer is standing by.
                </p>
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="text-slate-500 space-y-2 animate-fade-in-up" style={{ animationDelay: '1.5s' }}>
              {savedStories.length > 0 && (
                <p className="text-sm">
                  Or click "Saved Stories" above to resume a previous story.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Download Status Widget */}
      <DownloadStatus downloadService={downloadService} />
      
      <Footer stationService={stationService} onStationReset={() => setIsOnboarded(false)} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
