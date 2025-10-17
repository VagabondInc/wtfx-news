import React from 'react';
import { CharacterService } from '../services/characterService';
import { StationService } from '../services/stationService';

interface NewsTeamProps {
  characterService: CharacterService;
  charactersReady: boolean;
  stationService?: StationService;
}

export const NewsTeam: React.FC<NewsTeamProps> = ({ characterService, charactersReady, stationService }) => {
  if (!charactersReady) {
    return null;
  }

  const characters = characterService.getAllCharacters();
  const groupPhoto = characterService.getGroupPublicityPhoto();
  const stationBranding = stationService?.getStationBranding();
  const currentStation = stationService?.getCurrentStation();

  return (
    <div className="relative w-full max-w-6xl mx-auto my-8">
      {/* Background gradient and effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-purple-600/20 to-blue-600/20 rounded-2xl blur-xl"></div>
      
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
        {/* Header section */}
        <div 
          className="relative px-8 py-6"
          style={{ 
            background: `linear-gradient(to right, ${stationBranding?.primaryColor || '#dc2626'}, ${stationBranding?.secondaryColor || '#b91c1c'})`
          }}
        >
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Meet Your {stationBranding?.name || 'WTFX News'} Team
              </h2>
              <p className="text-red-100 text-sm">
                {currentStation?.description || 'Award-winning journalists bringing you the most absurd stories'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-lg">{stationBranding?.acronym || 'WTFX'}</div>
              <div className="text-red-100 text-xs">
                {stationBranding?.name.includes('News') ? 'NEWS' : (stationBranding?.name || 'NEWS NOW')}
              </div>
            </div>
          </div>
        </div>

        {/* Group Photo Section */}
        {groupPhoto && (
          <div className="relative p-8 border-b border-slate-700">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/30 to-transparent rounded-xl"></div>
                <div className="relative overflow-hidden rounded-xl border-2 border-slate-600 hover:border-red-500 transition-all duration-300">
                  <img
                    src={groupPhoto}
                    alt={`${stationBranding?.name || 'WTFX News'} Team`}
                    className="max-w-2xl w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-red-500/30">
                    <div className="text-white font-bold">{stationBranding?.name || 'WTFX News'} Team</div>
                    <div className="text-red-300 text-sm">{stationBranding?.tagline || 'Your Trusted News Source'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Characters display */}
        <div className="relative p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {characters.map((character, index) => {
              const imageUrl = characterService.getCharacterImageUrl(character.name);
              
              return (
                <div key={character.id} className="text-center group">
                  {/* Character image with professional styling */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-red-600/30 to-transparent rounded-xl"></div>
                    <div className="relative overflow-hidden rounded-xl border-2 border-slate-600 group-hover:border-red-500 transition-all duration-300">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={character.name}
                          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <div className="text-slate-400 text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-slate-600 rounded-full flex items-center justify-center">
                              <span className="text-2xl">👤</span>
                            </div>
                            <p className="text-sm">Generating...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Name badge overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-red-500/30">
                        <div className="text-white font-bold text-sm">{character.name}</div>
                        <div className="text-red-300 text-xs">{character.role}</div>
                      </div>
                    </div>
                  </div>

                  {/* Character details */}
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                      {character.name}
                    </h3>
                    <p className="text-slate-400 text-sm">{character.role}</p>
                    <p className="text-slate-500 text-xs font-mono">{character.tag}</p>
                  </div>

                  {/* Character backstory and specialties */}
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    {currentStation && currentStation.anchors[index] && (
                      <>
                        <p className="text-slate-400">Age {currentStation.anchors[index].age}</p>
                        <p className="text-slate-400">{currentStation.anchors[index].backstory}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentStation.anchors[index].specialties.map((specialty, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {currentStation && index === 2 && currentStation.reporter && (
                      <>
                        <p className="text-slate-400">Age {currentStation.reporter.age}</p>
                        <p className="text-slate-400">{currentStation.reporter.backstory}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentStation.reporter.specialties.map((specialty, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom branding */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                <span>📺 Broadcasting since 2024</span>
                <span>🎬 AI-Powered Production</span>
                <span>🏆 #1 in Absurd News</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 