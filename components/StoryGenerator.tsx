
import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { CharacterService } from '../services/characterService';

interface StoryGeneratorProps {
  onGenerate: () => void;
  isLoading: boolean;
  characterService: CharacterService;
  charactersReady: boolean;
  onCharactersGenerated: () => void;
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ 
  onGenerate, 
  isLoading, 
  characterService, 
  charactersReady, 
  onCharactersGenerated 
}) => {
  const [generatingCharacters, setGeneratingCharacters] = useState(false);

  const handleGenerateCharacters = async () => {
    setGeneratingCharacters(true);
    try {
      await characterService.generateAllCharacterImages();
      onCharactersGenerated();
    } catch (error) {
      console.error('Failed to generate characters:', error);
    } finally {
      setGeneratingCharacters(false);
    }
  };

  return (
    <div className="w-full max-w-2xl text-center my-8">
      <p className="text-slate-300 mb-4 text-lg">
        Our award-winning AI production team is ready. Give them the signal.
      </p>
      
      {!charactersReady && (
        <div className="mb-6 p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10">
          <p className="text-yellow-300 mb-3 text-sm">
            ⚠️ Character reference images not found. Generate them once for consistent video quality.
          </p>
          <button
            onClick={handleGenerateCharacters}
            disabled={generatingCharacters}
            className="relative inline-flex items-center justify-center px-6 py-2 text-sm font-bold text-black transition-all duration-200 bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-white"
          >
            {generatingCharacters ? (
              <>
                <LoadingSpinner />
                <span>Generating Characters...</span>
              </>
            ) : (
              'Generate Character Images'
            )}
          </button>
        </div>
      )}
      
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white transition-all duration-200 bg-red-600 rounded-md shadow-lg shadow-red-600/30 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>Generating...</span>
          </>
        ) : (
          'GENERATE NEWS'
        )}
      </button>
    </div>
  );
};
