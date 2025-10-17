import React from 'react';
import { AuthService } from '../services/authService';

export const SignIn: React.FC = () => {
  const auth = new AuthService();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
        <h1 className="text-2xl font-bold mb-4">Sign in to continue</h1>
        <p className="text-slate-600 mb-6">Use your Google account to save stories and assets to your Google Drive.</p>
        <button
          onClick={() => auth.signIn()}
          className="w-full flex items-center justify-center space-x-3 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50"
        >
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-5 h-5" />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
};

