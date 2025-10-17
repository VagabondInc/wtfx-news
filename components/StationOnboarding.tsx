import React, { useState, useEffect, useCallback } from 'react';
import { StationService } from '../services/stationService';
import { CharacterService } from '../services/characterService';
import { LogoService } from '../services/logoService';
import { LoadingSpinner } from './icons/LoadingSpinner';

const ABSURD_STATUS = [
  'Warming up the news anchor incubator…',
  'Injecting molten plastic into anchor mold-a-rama…',
  'Polishing the teleprompter hamster wheel…',
  'Counting pixels with extraordinary seriousness…',
  'Waiting for user to insert another 35¢ into the slot…',
  'Refilling the coffee IV for the control room…',
  'Teaching green screen to love the color green…',
  'Convincing microphones to stop being so dramatic…',
  'Defragmenting the newsroom’s collective attention span…',
  'Whispering compliments to the JPEG compressor…',
  'Coaxing lower-thirds out of their shells…',
  'Hyping the audience we haven’t invented yet…',
  'Assembling pixels with tiny journalism tweezers…',
  'Consulting the sacred manual of Broadcast Shenanigans…'
];

interface TVStation {
  id: string;
  name: string;
  acronym: string;
  tagline: string;
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    style: string;
  };
  anchors: any[];
  reporter: any;
  logoUrl?: string;
}

interface StationOnboardingProps {
  onOnboardingComplete: () => void;
}

export const StationOnboarding: React.FC<StationOnboardingProps> = ({
  onOnboardingComplete
}) => {
  const [stationService] = useState(() => new StationService());
  const [characterService] = useState(() => new CharacterService());
  const [logoService] = useState(() => new LogoService());
  const [step, setStep] = useState<'welcome' | 'generating' | 'selecting' | 'generating-characters' | 'complete'>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stations, setStations] = useState<TVStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [isGeneratingStations, setIsGeneratingStations] = useState(false);
  const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
  const [characterProgress, setCharacterProgress] = useState({ current: 0, total: 0 });
  const [backdoorActive, setBackdoorActive] = useState(false);
  const [generatedCharacters, setGeneratedCharacters] = useState<Array<{
    name: string;
    role: string;
    tag: string;
    imageUrl?: string;
    personality?: string;
    backstory?: string;
    isGenerating: boolean;
    isComplete: boolean;
  }>>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string>('');
  const [stationLogo, setStationLogo] = useState<{
    url?: string;
    isGenerating: boolean;
    isComplete: boolean;
  }>({ isGenerating: false, isComplete: false });
  const [absurdIndex, setAbsurdIndex] = useState(0);

  // Secret backdoor key combination detector
  const [keyState, setKeyState] = useState({
    cmd: false,
    leftShift: false,
    key1: false
  });

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.metaKey) setKeyState(prev => ({ ...prev, cmd: true }));
    if (event.shiftKey && event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
      setKeyState(prev => ({ ...prev, leftShift: true }));
    }
    if (event.key === '1') setKeyState(prev => ({ ...prev, key1: true }));
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!event.metaKey) setKeyState(prev => ({ ...prev, cmd: false }));
    if (!event.shiftKey) setKeyState(prev => ({ ...prev, leftShift: false }));
    if (event.key === '1') setKeyState(prev => ({ ...prev, key1: false }));
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const isBackdoorActive = keyState.cmd && keyState.leftShift && keyState.key1;
    setBackdoorActive(isBackdoorActive);
    
    if (isBackdoorActive) {
      console.log('🎬 WTFX Backdoor Activated!');
    }
  }, [keyState]);

  useEffect(() => {
    if (step !== 'generating-characters') {
      setAbsurdIndex(0);
      return;
    }

    const id = window.setInterval(() => {
      setAbsurdIndex((i) => (i + 1) % ABSURD_STATUS.length);
    }, 2200);

    return () => window.clearInterval(id);
  }, [step]);

  // Smooth step transition function
  const transitionToStep = (newStep: typeof step) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(newStep);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  // 3D Parallax Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.matchMedia("(pointer: coarse)").matches) {
        return; // Don't apply on touch devices
      }

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Calculate mouse position from center (-1 to 1)
      const xPos = (clientX / innerWidth - 0.5) * 2;
      const yPos = (clientY / innerHeight - 0.5) * 2;

      // Define max rotation
      const maxRotateX = 5; // degrees
      const maxRotateY = 8; // degrees
      
      // Apply transform
      const rotateY = xPos * maxRotateY;
      const rotateX = -yPos * maxRotateX;

      const mainContainer = document.querySelector('.main-container') as HTMLElement;
      if (mainContainer) {
        mainContainer.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    };

    const handleMouseLeave = () => {
      const mainContainer = document.querySelector('.main-container') as HTMLElement;
      if (mainContainer) {
        mainContainer.style.transform = 'rotateX(0deg) rotateY(0deg)';
      }
    };

    document.body.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.body.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const generateStations = async () => {
    setIsGeneratingStations(true);
    transitionToStep('generating');
    
    try {
      const generatedStations = await stationService.generateStationOptions(backdoorActive);
      
              // Generate logos for each station
        const stationsWithLogos = await Promise.all(
          generatedStations.map(async (station) => {
            try {
              const logoUrl = await logoService.generateStationLogo(station.name, station.acronym, station.tagline);
              return {
                ...station,
                logoUrl: logoUrl
              };
            } catch (error) {
              console.error(`Failed to generate logo for ${station.name}:`, error);
              return station;
            }
          })
        );
      
              setStations(stationsWithLogos);
        transitionToStep('selecting');
      
      // If backdoor, auto-select WTFX
      if (backdoorActive && stationsWithLogos.length > 0) {
        setSelectedStation(stationsWithLogos[0].id);
      }
    } catch (error) {
      console.error('Failed to generate stations:', error);
      alert('Failed to generate TV station options. Please try again.');
    } finally {
      setIsGeneratingStations(false);
    }
  };

  const selectStationAndGenerateCharacters = async () => {
    if (!selectedStation) return;
    
    const success = stationService.selectStation(selectedStation, stations);
    if (!success) {
      alert('Failed to select station. Please try again.');
      return;
    }

    transitionToStep('generating-characters');
    setIsGeneratingCharacters(true);

    try {
      const characters = stationService.getCharactersForGeneration();
      const selectedStationData = stations.find(s => s.id === selectedStation);
      console.log('👥 Characters to generate:', characters);
      setCharacterProgress({ current: 0, total: characters.length + 3 }); // +3 for logo, group photo and station assets

      // Initialize character state for preview
      const initialCharacters = characters.map(char => ({
        name: char.name,
        role: char.role,
        tag: char.tag,
        personality: char.personality,
        backstory: char.backstory,
        isGenerating: false,
        isComplete: false
      }));
      setGeneratedCharacters(initialCharacters);

      // Initialize logo state
      if (selectedStationData) {
        if ((selectedStationData as any).logoUrl) {
          console.log('🎨 Using existing station logo; will generate remaining assets...');
        } else {
          console.log('🎨 Will generate station logo with other assets...');
        }
        setStationLogo({ isGenerating: false, isComplete: false });
      }

      // Generate individual character images
      for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        console.log(`🎭 Generating character ${i + 1}/${characters.length}: ${character.name} (${character.tag})`);
        
        // Update character state to show it's generating
        setCurrentlyGenerating(character.name);
        setGeneratedCharacters(prev => 
          prev.map(char => 
            char.tag === character.tag 
              ? { ...char, isGenerating: true }
              : char
          )
        );
        setCharacterProgress(prev => ({ ...prev, current: i + 1 }));
        
        try {
          // Add timeout to individual character generation
          const characterPromise = characterService.generateSingleCharacterImage(
            character.tag,
            character.name,
            character.imagePrompt
          );
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Character generation timed out after 5 minutes')), 300000)
          );
          
          await Promise.race([characterPromise, timeoutPromise]);
          
          // Get the generated image URL
          const imageUrl = characterService.getCharacterImageUrlByTag(character.tag);
          
          // Update character state to show completion
          setGeneratedCharacters(prev => 
            prev.map(char => 
              char.tag === character.tag 
                ? { ...char, imageUrl, isGenerating: false, isComplete: true }
                : char
            )
          );
          
          console.log(`✅ Successfully generated character: ${character.name}`);
        } catch (charError) {
          console.error(`❌ Failed to generate character ${character.name}:`, charError);
          // Update character state to show failure but continue
          setGeneratedCharacters(prev => 
            prev.map(char => 
              char.tag === character.tag 
                ? { ...char, isGenerating: false, isComplete: false }
                : char
            )
          );
        }
      }
      
      setCurrentlyGenerating('');

      // Generate group publicity photo
      console.log('📸 Generating group publicity photo...');
      setCharacterProgress(prev => ({ ...prev, current: characters.length + 1 }));
      try {
        // Add timeout to group photo generation
        const groupPromise = characterService.generateGroupPhoto();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Group photo generation timed out after 5 minutes')), 300000)
        );
        
        await Promise.race([groupPromise, timeoutPromise]);
        console.log('✅ Successfully generated group photo');
        
        // Generate station assets (logo + background removal)
        if (selectedStationData) {
          console.log('🎨 Generating station assets...');
          setStationLogo({ isGenerating: true, isComplete: false });
          setCurrentlyGenerating('Station Logo & Assets');
          setCharacterProgress(prev => ({ ...prev, current: characters.length + 2 }));
          
          try {
            const stationAssetsPromise = characterService.generateStationAssets(
              selectedStationData.name,
              selectedStationData.acronym,
              selectedStationData.tagline,
              (selectedStationData as any).logoUrl
            );
            const assetsTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Station assets generation timed out after 5 minutes')), 300000)
            );
            
            const assets = await Promise.race([stationAssetsPromise, assetsTimeoutPromise]) as { logoUrl: string; teamPhotoNoBgUrl: string };
            
            // Update logo with the actual generated URL
            setStationLogo({ url: assets.logoUrl, isGenerating: false, isComplete: true });
            setCurrentlyGenerating('');
            
            console.log('✅ Successfully generated station assets');
          } catch (assetsError) {
            console.error('❌ Failed to generate station assets:', assetsError);
            setStationLogo({ isGenerating: false, isComplete: false });
            setCurrentlyGenerating('');
            // Continue even if assets generation fails
          }
        }
      } catch (groupError) {
        console.error('❌ Failed to generate group photo:', groupError);
        // Continue even if group photo fails
      }

      console.log('🎉 All character generation attempts complete, transitioning to completion screen...');
      setStep('complete');
      
      // Short delay to show completion, then finish onboarding
      console.log('🎉 Character generation complete, setting up auto-redirect...');
      setTimeout(() => {
        console.log('🚀 Auto-redirecting to main UI...');
        onOnboardingComplete();
      }, 3000);

    } catch (error) {
      console.error('❌ Critical error in character generation:', error);
      alert(`Failed to generate character images: ${error instanceof Error ? error.message : 'Unknown error'}. You can retry this later from the main app.`);
      // Still complete onboarding even if character generation fails
      onOnboardingComplete();
    } finally {
      setIsGeneratingCharacters(false);
    }
  };

  const resetAndStartOver = () => {
    stationService.resetStation();
    setStep('welcome');
    setStations([]);
    setSelectedStation('');
    setCharacterProgress({ current: 0, total: 0 });
    setGeneratedCharacters([]);
    setCurrentlyGenerating('');
    setStationLogo({ isGenerating: false, isComplete: false });
  };

  if (step === 'welcome') {
    return (
      <div style={{ 
        margin: 0,
        fontFamily: "'Poppins', sans-serif",
        color: '#fff',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        perspective: '1000px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateX(-100vw)' : 'translateX(0)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
          onError={(e) => {
            console.log('Video failed to load, using fallback');
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/assets/newsroom-background.webm" type="video/webm" />
        </video>

        <div className="main-container" style={{
          position: 'relative',
          transition: 'transform 0.1s ease-out',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          
          <div style={{
            width: '500px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '28px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)'
          }}>

            <div style={{
              background: 'rgba(30, 27, 48, 0.7)',
              padding: '30px 40px',
              paddingBottom: '90px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Welcome to your
              </p>
              <h1 style={{
                margin: 0,
                fontSize: '4.5rem',
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: '-2px'
              }}>
                <span style={{
                  fontSize: '2rem',
                  color: '#90ee90',
                  marginRight: '5px',
                  verticalAlign: 'middle'
                }}>▶</span> Absurd<br/>
                <span style={{
                  background: 'linear-gradient(90deg, #fff, #6EB1F7)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>News Empire</span>
              </h1>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#1E1B30',
              padding: '20px 40px 30px',
              borderTop: '1.5px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                color: '#6a7185',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#f36aa4',
                  borderRadius: '4px'
                }}></div>
                <span>Eliretiyo F- Oetotini ⟩</span>
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 25px 0',
                fontWeight: 600,
                fontSize: '1.1rem'
              }}>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#f36aa4'
                  }}></div>
                  Custom TV Station
                </li>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#4cd3c2'
                  }}></div>
                  Unique name, logo, and branding
                </li>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#55b2f2'
                  }}></div>
                  News Team
                </li>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#a4e07c'
                  }}></div>
                  2 anchors + 1 field reporter
                </li>
              </ul>

              {!isGeneratingStations ? (
                <button
                  onClick={generateStations}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: backdoorActive ? 'linear-gradient(90deg, #9333ea, #ec4899)' : 'linear-gradient(90deg, #44A2F0, #A46BFE)',
                    border: 'none',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {backdoorActive ? '🎬 Generate WTFX Station' : 'Generate My TV Station Options'}
                </button>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'rgba(68, 162, 240, 0.2)',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #44A2F0, #A46BFE)',
                      borderRadius: '4px',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}></div>
                  </div>
                  <p style={{ 
                    fontSize: '0.9rem',
                    color: '#1E1B30',
                    margin: 0,
                    fontWeight: 600
                  }}>
                    Generating TV Stations...
                  </p>
                </div>
              )}

              <p style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#6a7185',
                margin: '15px 0 0 0'
              }}>
                This is a one-time setup, you can always come back later.
              </p>
              
              {backdoorActive && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#9333ea',
                  margin: '10px 0 0 0',
                  fontWeight: 600
                }}>
                  🎬 WTFX Backdoor Active!
                </div>
              )}
            </div>
          </div>

          <img 
            src="/assets/anchor.png" 
            alt="News Anchor pointing towards the user" 
            style={{
              width: '400px',
              height: 'auto',
              pointerEvents: 'none',
              zIndex: 2,
              flexShrink: 0,
              transform: isTransitioning ? 'translateX(100px) scale(0.9)' : 'translateX(0) scale(1)',
              opacity: isTransitioning ? 0 : 1,
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
            }}
            onError={(e) => {
              console.log('Anchor image failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />

        </div>

        {/* Responsive Design */}
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                opacity: 0.6;
              }
              50% {
                opacity: 1;
              }
            }
            
                         @media (max-width: 1000px) {
               .main-container {
                 flex-direction: column !important;
                 gap: 1rem !important;
               }
               .main-container img {
                 width: 300px !important;
               }
             }

             @media (max-width: 600px) {
               .main-container {
                 transform: scale(0.9) !important;
               }
               .main-container img {
                 width: 250px !important;
               }
             }

             @media (max-width: 500px) {
               .main-container {
                 transform: scale(0.8) !important;
               }
               .main-container h1 {
                 font-size: 3.5rem !important;
               }
               .main-container img {
                 width: 200px !important;
               }
             }
          `}
        </style>
      </div>
    );
  }

  if (step === 'generating') {
    return (
      <div style={{ 
        margin: 0,
        fontFamily: "'Poppins', sans-serif",
        color: '#fff',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        perspective: '1000px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateX(100vw)' : 'translateX(0)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
          onError={(e) => {
            console.log('Video failed to load, using fallback');
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/assets/newsroom-background.webm" type="video/webm" />
        </video>

        <div className="main-container" style={{
          position: 'relative',
          transition: 'transform 0.1s ease-out',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          
          <img 
            src="/assets/ANCHOR2.png" 
            alt="News Anchor 2" 
            style={{
              width: '400px',
              height: 'auto',
              pointerEvents: 'none',
              zIndex: 2,
              flexShrink: 0,
              transform: isTransitioning ? 'translateX(-100px) scale(0.9)' : 'translateX(0) scale(1)',
              opacity: isTransitioning ? 0 : 1,
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s'
            }}
            onError={(e) => {
              console.log('Anchor2 image failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />

          <div style={{
            width: '500px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '28px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)'
          }}>

            <div style={{
              background: 'rgba(30, 27, 48, 0.7)',
              padding: '30px 40px',
              paddingBottom: '90px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Creating your
              </p>
              <h1 style={{
                margin: 0,
                fontSize: '4.5rem',
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: '-2px'
              }}>
                <span style={{
                  fontSize: '2rem',
                  color: '#90ee90',
                  marginRight: '5px',
                  verticalAlign: 'middle'
                }}>▶</span> TV Station<br/>
                <span style={{
                  background: 'linear-gradient(90deg, #fff, #6EB1F7)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>Options</span>
              </h1>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#1E1B30',
              padding: '20px 40px 30px',
              borderTop: '1.5px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                color: '#6a7185',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#f36aa4',
                  borderRadius: '4px'
                }}></div>
                <span>AI Generation in Progress ⟩</span>
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 25px 0',
                fontWeight: 600,
                fontSize: '1.1rem'
              }}>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#f36aa4'
                  }}></div>
                  4 Unique TV Stations
                </li>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#4cd3c2'
                  }}></div>
                  Custom logos and branding
                </li>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#55b2f2'
                  }}></div>
                  Character personalities
                </li>
                <li style={{
                  paddingLeft: '25px',
                  marginBottom: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '15px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#a4e07c'
                  }}></div>
                  Detailed backstories
                </li>
              </ul>

              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'rgba(68, 162, 240, 0.2)',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #44A2F0, #A46BFE)',
                    borderRadius: '4px',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}></div>
                </div>
                <p style={{ 
                  fontSize: '0.9rem',
                  color: '#1E1B30',
                  margin: 0,
                  fontWeight: 600
                }}>
                  Generating TV Station Options...
                </p>
              </div>

              <p style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#6a7185',
                margin: '15px 0 0 0'
              }}>
                This usually takes 30-60 seconds.
              </p>
            </div>
          </div>

        </div>

        {/* Responsive Design */}
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                opacity: 0.6;
              }
              50% {
                opacity: 1;
              }
            }
            
            @media (max-width: 1000px) {
              .main-container {
                flex-direction: column !important;
                gap: 1rem !important;
              }
              .main-container img {
                width: 300px !important;
              }
            }

            @media (max-width: 600px) {
              .main-container {
                transform: scale(0.9) !important;
              }
              .main-container img {
                width: 250px !important;
              }
            }

            @media (max-width: 500px) {
              .main-container {
                transform: scale(0.8) !important;
              }
              .main-container h1 {
                font-size: 3.5rem !important;
              }
              .main-container img {
                width: 200px !important;
              }
            }
          `}
        </style>
      </div>
    );
  }

  if (step === 'selecting') {
    return (
      <div style={{ 
        margin: 0,
        fontFamily: "'Poppins', sans-serif",
        color: '#fff',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        perspective: '1000px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateY(100vh)' : 'translateY(0)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
          onError={(e) => {
            console.log('Video failed to load, using fallback');
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/assets/newsroom-background.webm" type="video/webm" />
        </video>

        <div style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '1200px',
          padding: '2rem'
        }}>
          
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h2 style={{
              fontSize: '3rem',
              fontWeight: 800,
              color: 'white',
              marginBottom: '1rem',
              background: 'linear-gradient(90deg, #fff, #6EB1F7)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Choose Your TV Station
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Select the station that will deliver your absurd news stories
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {stations.slice(0, 4).map((station, index) => {
              const isSelected = selectedStation === station.id;
              const isOther = selectedStation && !isSelected;
              
              return (
                <div
                  key={station.id}
                  onClick={() => setSelectedStation(station.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '2rem',
                    cursor: 'pointer',
                    transform: isTransitioning 
                      ? `translateY(50px) scale(0.9)` 
                      : isSelected 
                      ? 'translateY(0) scale(1.05)' 
                      : isOther 
                      ? 'translateY(0) scale(0.95)' 
                      : 'translateY(0) scale(1)',
                    opacity: isTransitioning ? 0 : isOther ? 0.4 : 1,
                    transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`,
                    border: isSelected ? '3px solid #6EB1F7' : '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: isSelected 
                      ? '0 20px 40px rgba(110, 177, 247, 0.3)' 
                      : '0 10px 30px rgba(0, 0, 0, 0.2)',
                    zIndex: isSelected ? 10 : 1,
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isOther && !isTransitioning) {
                      e.currentTarget.style.transform = isSelected ? 'translateY(0) scale(1.08)' : 'translateY(0) scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTransitioning) {
                      e.currentTarget.style.transform = isSelected ? 'translateY(0) scale(1.05)' : isOther ? 'translateY(0) scale(0.95)' : 'translateY(0) scale(1)';
                    }
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    {/* Logo */}
                    {station.logoUrl ? (
                      <div style={{ marginBottom: '1rem' }}>
                        <img 
                          src={station.logoUrl}
                          alt={`${station.name} Logo`}
                          style={{
                            width: '120px',
                            height: '60px',
                            objectFit: 'contain',
                            margin: '0 auto'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 800,
                          marginBottom: '1rem',
                          color: station.theme.primaryColor
                        }}
                      >
                        {station.acronym}
                      </div>
                    )}

                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: '#1E1B30',
                      marginBottom: '0.5rem'
                    }}>
                      {station.name}
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: station.theme.secondaryColor,
                      marginBottom: '1rem'
                    }}>
                      "{station.tagline}"
                    </p>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginBottom: '1.5rem',
                      lineHeight: 1.4
                    }}>
                      {station.description}
                    </p>
                    
                    <div style={{
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '1rem',
                      marginBottom: isSelected ? '1.5rem' : '0'
                    }}>
                      <h4 style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        News Team
                      </h4>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        lineHeight: 1.3
                      }}>
                        {station.anchors.map((anchor, index) => (
                          <div key={index}>• {anchor.name}</div>
                        ))}
                        <div>• {station.reporter.name}</div>
                      </div>
                    </div>

                    {/* Button appears only on selected card */}
                    {isSelected && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectStationAndGenerateCharacters();
                          }}
                          disabled={isGeneratingCharacters}
                          style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#fff',
                            background: !isGeneratingCharacters
                              ? 'linear-gradient(90deg, #44A2F0, #A46BFE)'
                              : '#9ca3af',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: !isGeneratingCharacters ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            marginBottom: '0.5rem'
                          }}
                          onMouseEnter={(e) => {
                            if (!isGeneratingCharacters) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(68, 162, 240, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {isGeneratingCharacters ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                              <LoadingSpinner size={20} />
                              Creating News Team...
                            </div>
                          ) : (
                            '🎬 Create My News Team'
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStation('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            color: '#6b7280',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#374151';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280';
                          }}
                        >
                          Choose Different Station
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset button - only show when no station is selected */}
          {!selectedStation && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={resetAndStartOver}
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                Start Over with Different Options
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'generating-characters') {
    const progressPercentage = characterProgress.total > 0 ? (characterProgress.current / characterProgress.total) * 100 : 0;
    const selectedStationData = stations.find(s => s.id === selectedStation);

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 overflow-y-auto py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-white mb-6">
              🎬 Meet Your News Team
            </h2>
            
            {/* Station Logo Section */}
            {selectedStationData && (
              <div className="mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
                  {/* Logo Display */}
                  <div className="flex justify-center mb-4">
                    <div className="w-32 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg">
                      {stationLogo.url ? (
                        <img 
                          src={stationLogo.url} 
                          alt={`${selectedStationData.name} Logo`}
                          className="max-w-full max-h-full object-contain animate-fade-in"
                        />
                      ) : stationLogo.isGenerating ? (
                        <div className="text-center">
                          <LoadingSpinner size={24} />
                          <p className="text-xs text-gray-600 mt-1">Generating...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-400">
                            {selectedStationData.acronym}
                          </div>
                          <p className="text-xs text-gray-500">Logo Coming Soon</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Station Info */}
                  <h3 className="text-2xl font-bold text-white mb-2" style={{ color: selectedStationData.theme.primaryColor }}>
                    {selectedStationData.name}
                  </h3>
                  <p className="text-lg text-red-100 mb-4">
                    "{selectedStationData.tagline}"
                  </p>
                  
                  {/* Logo Status */}
                  <div className="flex items-center justify-center">
                    {stationLogo.isComplete ? (
                      <div className="flex items-center text-green-300">
                        <span className="text-sm">✅ Logo Ready</span>
                      </div>
                    ) : stationLogo.isGenerating ? (
                      <div className="flex items-center text-yellow-300">
                        <LoadingSpinner size={16} />
                        <span className="text-sm ml-2">Generating Logo...</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-300">
                        <span className="text-sm">⏳ Logo Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress Bar */}
            <div className="bg-white/20 rounded-full h-3 mb-4 max-w-md mx-auto">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-lg font-semibold text-white">
              {characterProgress.current} of {characterProgress.total} complete
            </p>
            <p className="text-sm text-gray-300 mt-2 min-h-[1.5rem]">
              {ABSURD_STATUS[absurdIndex]}
            </p>
          </div>

          {/* Characters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {generatedCharacters.map((character, index) => (
              <div
                key={character.tag}
                className={`
                  bg-white rounded-2xl p-6 shadow-2xl transform transition-all duration-500
                  ${character.isGenerating ? 'animate-pulse scale-105 ring-4 ring-yellow-400' : ''}
                  ${character.isComplete ? 'animate-fade-in-up' : ''}
                `}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Character Image */}
                <div className="relative mb-4">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    {character.imageUrl ? (
                      <img 
                        src={character.imageUrl} 
                        alt={character.name}
                        className="w-full h-full object-cover animate-fade-in"
                      />
                    ) : character.isGenerating ? (
                      <div className="text-center">
                        <LoadingSpinner size={32} />
                        <p className="text-xs text-gray-600 mt-2">Generating...</p>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-4xl">👤</div>
                    )}
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute -top-2 -right-2">
                    {character.isComplete ? (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm animate-bounce">
                        ✓
                      </div>
                    ) : character.isGenerating ? (
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-spin">
                        <LoadingSpinner size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm">
                        ⏳
                      </div>
                    )}
                  </div>
                </div>

                {/* Character Info */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {character.name}
                  </h3>
                  <p className="text-sm font-semibold text-blue-600 mb-3">
                    {character.role}
                  </p>
                  
                  {/* Personality */}
                  {character.personality && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3 text-left">
                      <h4 className="text-xs font-semibold text-blue-800 mb-1">PERSONALITY</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {character.personality}
                      </p>
                    </div>
                  )}
                  
                  {/* Backstory */}
                  {character.backstory && (
                    <div className="bg-purple-50 rounded-lg p-3 text-left">
                      <h4 className="text-xs font-semibold text-purple-800 mb-1">BACKSTORY</h4>
                      <p className="text-xs text-purple-700 leading-relaxed">
                        {character.backstory}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Status */}
          <div className="text-center mb-8">
            {currentlyGenerating && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
                <p className="text-white font-semibold">
                  🎨 Currently generating: <span className="text-yellow-300">{currentlyGenerating}</span>
                </p>
              </div>
            )}
            
            {characterProgress.current >= generatedCharacters.length && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
                <p className="text-white font-semibold">
                  {characterProgress.current === generatedCharacters.length + 1 
                    ? "📸 Generating team publicity photo..."
                    : "🎨 Generating station logo and processing assets..."
                  }
                </p>
              </div>
            )}
          </div>

          {/* Emergency skip button */}
          <div className="text-center">
            <button
              onClick={() => {
                console.log('🚨 User manually skipped character generation');
                setStep('complete');
                setTimeout(() => {
                  onOnboardingComplete();
                }, 1000);
              }}
              className="px-6 py-3 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
            >
              Skip & Continue to Main App
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    const selectedStationData = stations.find(s => s.id === selectedStation);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">
              Welcome to Your News Empire!
            </h2>
            
            {selectedStationData && (
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2" style={{ color: selectedStationData.theme.primaryColor }}>
                  {selectedStationData.name}
                </h3>
                <p className="text-lg text-gray-600" style={{ color: selectedStationData.theme.secondaryColor }}>
                  "{selectedStationData.tagline}"
                </p>
              </div>
            )}
          </div>

          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-green-800 mb-3">Setup Complete!</h4>
            <div className="text-sm text-green-700 space-y-2">
              <p>✅ TV Station Created</p>
              <p>✅ News Team Generated</p>
              <p>✅ Character Images Ready</p>
              <p>✅ Publicity Photos Complete</p>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Your personalized news station is ready to start generating absurd stories!
          </p>

          <button
            onClick={onOnboardingComplete}
            className="px-8 py-4 rounded-xl font-bold text-white text-xl shadow-lg transform transition-all duration-200 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-105 hover:shadow-xl mb-4"
          >
            🚀 Launch News Empire
          </button>

          <div className="text-sm text-gray-500">
            <p>Click above to continue, or wait for automatic redirect...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}; 
