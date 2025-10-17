/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    // If you add a src/ directory later, uncomment the next line
    // "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-in-up': 'slideInUp 0.5s ease-out',
        'marquee': 'marquee 20s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.8)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      colors: {
        'wtfx-red': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        'wtfx-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'wtfx-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'news-gradient': 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        'extravagant-gradient': 'linear-gradient(45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'wtfx-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'wtfx-glow-lg': '0 0 40px rgba(59, 130, 246, 0.5)',
        'wtfx-red-glow': '0 0 20px rgba(239, 68, 68, 0.3)',
        'wtfx-purple-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      fontFamily: {
        'news': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 
