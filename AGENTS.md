# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WTFX News Now is a satirical AI-powered news generator that creates absurdist news stories with complete video production pipeline. The application generates viral fake news content with AI-generated videos, voice cloning, B-roll footage, and professional graphics.

## Core Architecture

### Frontend (React + TypeScript + Vite)
- **Main App Component** (`App.tsx`): Manages application state, story generation, and video production workflow
- **Components**: Modular UI components in `/components/` directory for different parts of the news generation pipeline
- **Services**: API integration layer in `/services/` handling different AI service integrations
- **Types** (`types.ts`): TypeScript interfaces for stories, video segments, and API responses

### Backend (Express + Socket.io)
- **Proxy Server** (`server/proxy-server.js`): Express server with SQLite database for API logging and WebSocket support
- Handles API proxying for external services (segmind, gemini, etc.)
- Real-time progress updates via Socket.io

### Key Services Integration
- **Google Gemini AI**: Story generation via `geminiService.ts`
- **Segmind API**: Seedance Lite i2v video generation, Chatterbox voice cloning and audio generation, gemini imagen4 graphics
- **Video Pipeline**: Multi-stage video generation process with segment-based approach

## Development Commands

```bash
# Development (frontend only)
npm run dev

# Development with specific port
npm run dev:port

# Full development (frontend + backend)
npm run dev:full

# Backend server only
npm run server

# Production build
npm run build

# Clean restart (kills all processes first)
npm run start

# Launch with auto-open browser
npm run launch

# Full launch with auto-open
npm run full
```

## Environment Setup

Create `.env` file with required API keys:
- `GEMINI_API_KEY`: Google Gemini AI API key
- `GEGMIND_API_KEY`: Replicate API token

Note: Vite requires `VITE_` prefix for client-side env vars, but the config handles mapping from `GEMINI_API_KEY` to the client-side code.

## Story Generation Pipeline

1. **Story Creation**: Gemini generates structured JSON with video segments
2. **Video Segments**: Three types - `veo3` (on-camera dialog), `runway` (B-roll visuals), `tts_voiceover` (voice narration)
3. **Character System**: Persistent anchor/reporter characters with generated images
4. **Storage System**: Local storage for story persistence and resume functionality
5. **Station Onboarding**: Initial setup flow for user's "news station" branding

## Key Data Flow

Stories follow this structure:
- `Story`: Contains metadata and array of `Segment` objects
- `Segment`: Defines video segment type, duration, character, dialog, and visual descriptions
- `GeneratedVideo`: Tracks video generation progress with `VideoSegment` objects containing URLs and status

## Architecture Patterns

- **Service Layer**: Each external API has dedicated service class
- **State Management**: React state with local storage persistence
- **Error Handling**: ErrorBoundary component with graceful degradation
- **Progress Tracking**: Real-time updates for multi-stage video generation process
- **Modular Components**: Separation of concerns between story generation, display, and video production

## Important Notes

- The project uses a satirical "over-engineered" theme as part of its concept
- Video generation is computationally expensive and may take several minutes
- API rate limits and costs should be monitored across all integrated services
- The application includes demo mode and comprehensive error handling for production use