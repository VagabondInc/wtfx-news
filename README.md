# 🎬 WTFX News Now - AI News Generator

*"When a local TV station gets a $5M grant for a website overhaul but only needed $25K"*

## 📺 About WTFX News Now

WTFX News Now is an extravagant, over-engineered AI-powered news story generator that creates viral, absurdist news content complete with:

- 🤖 **AI-Generated Stories** - Powered by Google Gemini
- 🎬 **Seedance Lite i2v Video Generation** - On-camera anchor and reporter segments
- 📹 **Seedance Lite i2v B-Roll** - AI-generated background footage
- 🎤 **Voice Cloning** - Chatterbox-powered voice synthesis
- 🎨 **Dynamic Graphics** - Gemini Imagen4 lower thirds
- ✂️ **Background Removal** - Professional graphic processing
- 🎭 **Complete Video Production** - Full news broadcast pipeline

## 🚀 Features

### Story Generation
- **Absurdist News Stories** - Completely original, viral-worthy content
- **Structured Segments** - Studio intro, field reporter, witness interviews, B-roll, outro
- **Professional Format** - TV news broadcast structure with proper timing

### Video Production Pipeline
1. **Seedance Lite i2v Generation** - 8-second on-camera segments for anchors and reporters
2. **Generate TTS Audio for each segment using reference audio** - using Fal.ai chatterbox
4. **B-Roll Generation** - 5-second visual segments with Seedance Lite i2v
5. **Lower Third Graphics** - Professional news graphics with gemini imagen4
6. **Background Removal** - Clean graphics processing
7. **TTS Generation** - Voice-cloned narration for B-roll segments with Fal.ai chatterbox
8. **Video Composition** - Final assembly and editing

### Extravagant UI
- **$5M Grant Aesthetic** - Over-the-top design that looks like money was no object
- **Real-time Progress Tracking** - Detailed generation pipeline visualization
- **Professional News Station Branding** - WTFX News Now identity
- **Animated Elements** - Pulsing lights, ticker tape, gradient effects

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **AI Story Generation**: Google Gemini 2.5 Flash
- **Video Generation**: Fal.ai Seedance Lite i2v
- **Voice Cloning**: Chatterbox (via Fal.ai)
- **B-Roll Generation**: Seedance Lite i2v
- **Graphics**: Gemini Imagen4
- **Background Removal**: BackgroundRemover (via Fal.ai)
- **Audio Processing**: FFmpeg.js + Web Audio API
- **Video Composition**: HTML5 Canvas

## 📋 Prerequisites

- Node.js 18+ and npm
- API Keys for:
  - Google Gemini AI
  - Fal.ai (for seedance, Chatterbox, BackgroundRemover)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/wtfx-news-now-generator.git
   cd wtfx-news-now-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Google Gemini AI
   API_KEY=your_gemini_api_key_here
   
   # Fal.ai API (for Veo3, Chatterbox, Runway, Ideogram, BackgroundRemover)
   FAL_API_KEY=
   
   # RunwayML API (direct access)
   RUNWAY_API_KEY=k
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 Usage

1. **Generate a Story**
   - Click "Generate News" to create a new absurdist news story
   - The AI will create a complete story with all segments

2. **Create the Video**
   - Click "Generate News Video" to start the video production pipeline
   - Watch the real-time progress as each component is generated

3. **View Results**
   - See the complete video with all segments
   - Download or share your generated news broadcast

## 📁 Project Structure

```
wtfx-news-now-generator/
├── components/           # React components
│   ├── Header.tsx       # Extravagant station header
│   ├── Footer.tsx       # Over-engineered footer
│   ├── StoryGenerator.tsx # Story generation UI
│   ├── StoryDisplay.tsx # Story preview
│   ├── VideoGenerator.tsx # Video generation pipeline
│   └── icons/           # Custom icons
├── services/            # API services
│   ├── geminiService.ts # Story generation
│   └── videoGenerationService.ts # Video pipeline
├── types.ts             # TypeScript interfaces
├── App.tsx              # Main application
└── package.json         # Dependencies
```

## 🎭 The Backstory

*"In 2024, WTFX News Now, a small local television station in the fictional town of Absurdville, received a $5 million grant from the 'Future of Media Innovation Fund' to 'revolutionize their digital presence.'*

*The grant was intended for a complete website overhaul, but the station's web developer (who only needed about $25K) decided to go all out and build the most extravagant, over-engineered news generation system possible.*

*The result? A state-of-the-art AI news production studio that can generate complete news broadcasts from scratch, complete with AI-generated videos, voice cloning, and professional graphics - all for the price of a small website redesign."*

## 🤝 Contributing

This is a satirical project, but contributions are welcome! Feel free to:

- Add more absurd story templates
- Enhance the video generation pipeline
- Improve the extravagant UI design
- Add more AI service integrations

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is a fictional news generator for entertainment purposes only. All generated content is satirical and should not be considered real news. The "5 million dollar grant" backstory is entirely fictional.

---

*"When life gives you a $5M grant for a website, build an AI news studio instead."* - WTFX News Now Motto
