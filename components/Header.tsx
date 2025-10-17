import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { DriveService } from '../services/driveService';

interface HeaderProps {
  stationBranding?: {
    name: string;
    acronym: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ stationBranding }) => {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [teamPhotoNoBgUrl, setTeamPhotoNoBgUrl] = useState<string>('');
  const auth = new AuthService();
  const [userEmail, setUserEmail] = useState<string>('');
  const drive = new DriveService();

  // Default to WTFX branding if no custom branding provided
  const branding = stationBranding || {
    name: 'WTFX News Now',
    acronym: 'WTFX',
    tagline: 'Next-Gen News Production',
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626'
  };

  useEffect(() => {
    auth.fetchStatus().then(st => setUserEmail(st.user?.email || ''));

    const loadAssets = async () => {
      try {
        const kv: any = await drive.getKV('station-assets', 'stories');
        if (kv?.logoUrl) setLogoUrl(kv.logoUrl);
        if (kv?.teamPhotoNoBgUrl) setTeamPhotoNoBgUrl(kv.teamPhotoNoBgUrl);
        if (!kv?.teamPhotoNoBgUrl && kv?.groupPhotoUrl) setTeamPhotoNoBgUrl(kv.groupPhotoUrl);
      } catch {}
    };
    void loadAssets();

    const onUpdate = () => loadAssets();
    window.addEventListener('station-assets-updated', onUpdate as any);
    return () => {
      window.removeEventListener('station-assets-updated', onUpdate as any);
    };
  }, []);

  return (
    <header className="relative bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 shadow-2xl">
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 px-4 py-2">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <span className="text-white font-medium text-sm hover:text-blue-300 cursor-pointer transition-colors">
              {branding.acronym}
            </span>
            <span className="text-white font-medium text-sm hover:text-blue-300 cursor-pointer transition-colors">
              2024
            </span>
            <span className="text-white font-medium text-sm hover:text-blue-300 cursor-pointer transition-colors">
              100W
            </span>
            <span className="text-white font-medium text-sm hover:text-blue-300 cursor-pointer transition-colors">
              NEAW15
            </span>
            <span className="text-white font-medium text-sm hover:text-blue-300 cursor-pointer transition-colors">
              NEW NOW
            </span>
            <span className="text-white font-medium text-sm hover:text-blue-300 cursor-pointer transition-colors">
              NOW
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="bg-white text-slate-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-slate-100 cursor-pointer transition-colors">
              Today
            </span>
            {userEmail && (
              <button onClick={() => auth.signOut()} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors">
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Header Content */}
      <div className="relative h-64 bg-gradient-to-r from-slate-200 via-blue-100 to-slate-200">
        {/* Background cityscape or pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-slate-700/10 to-blue-900/10"></div>
        
        <div className="container mx-auto px-4 h-full flex items-center justify-between relative">
          {/* Left side - Station Logo */}
          <div className="flex items-center space-x-6 animate-slide-in-left">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${branding.name} Logo`}
                className="h-20 w-auto object-contain animate-float"
              />
            ) : (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-800">
                    <span 
                      className="bg-clip-text text-transparent animate-glow-pulse"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})`
                      }}
                    >
                      {branding.acronym}
                    </span>
                  </h1>
                  <div 
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping"
                    style={{ backgroundColor: branding.primaryColor }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Center - Station Name and Tagline */}
          <div className="text-center flex-1 px-8 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 animate-typewriter">
              {branding.name.toUpperCase()}
            </h2>
            <p className="text-lg text-slate-600 font-medium animate-pulse">
              {branding.tagline}
            </p>
          </div>

          {/* Right side - Team Photo */}
          <div className="flex items-center animate-slide-in-right">
            {teamPhotoNoBgUrl ? (
              <div className="relative group">
                <img 
                  src={teamPhotoNoBgUrl} 
                  alt="News Team"
                  className="h-48 w-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ) : (
              <div className="h-48 w-64 bg-gradient-to-r from-slate-300 to-blue-300 rounded-lg flex items-center justify-center animate-pulse">
                <span className="text-slate-600 font-medium">News Team</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Date/Time Strip */}
        <div className="absolute bottom-0 right-0 bg-slate-800 text-white px-4 py-1 text-sm font-mono">
          WEC {new Date().toLocaleDateString('en-US', { 
            month: 'numeric', 
            day: 'numeric', 
            year: '2-digit'
          })}
        </div>
      </div>
      
      {/* Animated news ticker */}
      <div className="bg-gradient-to-r from-red-600/20 to-blue-600/20 border-t border-red-500/30">
        <div className="overflow-hidden whitespace-nowrap py-2">
          <div className="animate-marquee inline-block">
            <span className="text-white text-sm font-medium mx-8">
              🎬 AI-Generated Videos • 🎤 Voice Cloning • 🎨 Dynamic Graphics • 📹 B-Roll Generation • 🎭 Professional News Production
            </span>
            <span className="text-white text-sm font-medium mx-8">
              🎬 AI-Generated Videos • 🎤 Voice Cloning • 🎨 Dynamic Graphics • 📹 B-Roll Generation • 🎭 Professional News Production
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
