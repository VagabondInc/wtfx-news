import React, { useState } from 'react';
import { StationService } from '../services/stationService';

interface FooterProps {
  stationService?: StationService;
  onStationReset?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ stationService, onStationReset }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const stationBranding = stationService?.getStationBranding();

  const handleResetStation = () => {
    if (stationService && onStationReset) {
      stationService.resetStation();
      onStationReset();
      setShowResetConfirm(false);
    }
  };
  return (
    <footer className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-t-4 border-gradient-to-r from-red-500 via-blue-500 to-purple-500 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Station Info */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center md:justify-start">
              <span className="text-red-500 mr-2">📺</span>
              {stationBranding?.name || 'WTFX News Now'}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {stationBranding?.tagline || 'Your premier source for AI-generated absurdist news content. Powered by cutting-edge technology and a $5M website grant.'}
            </p>
            
            {stationService && onStationReset && (
              <div className="mt-4">
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors underline"
                  >
                    🔄 Reset Station & Start Over
                  </button>
                ) : (
                  <div className="text-xs space-y-2">
                    <p className="text-yellow-400">⚠️ This will delete all data and restart onboarding</p>
                    <div className="space-x-2">
                      <button
                        onClick={handleResetStation}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Confirm Reset
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-2 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Technology Stack */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center">
              <span className="text-blue-400 mr-2">⚡</span>
              Powered By
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-green-400">🤖</span>
                <span>Google Gemini AI</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-purple-400">🎬</span>
                <span>Google Veo3 Video</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-blue-400">🎤</span>
                <span>Chatterbox Voice Clone</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-yellow-400">🎨</span>
                <span>Ideogram Graphics</span>
              </div>
            </div>
          </div>

          {/* Contact & Links */}
          <div className="text-center md:text-right">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center md:justify-end">
              <span className="text-purple-400 mr-2">🔗</span>
              Connect
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-center md:justify-end space-x-2">
                <span className="text-red-400">📧</span>
                <span>news@wtfx.com</span>
              </div>
              <div className="flex items-center justify-center md:justify-end space-x-2">
                <span className="text-blue-400">📱</span>
                <span>@WTFXNewsNow</span>
              </div>
              <div className="flex items-center justify-center md:justify-end space-x-2">
                <span className="text-green-400">📺</span>
                <span>Channel 42</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-slate-400 text-sm">
              © 2024 {stationBranding?.name || 'WTFX News Now'}. All rights reserved. 
              <span className="text-purple-400 ml-2">(Even the absurd ones)</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                AI Production Active
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                Live Generation
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
