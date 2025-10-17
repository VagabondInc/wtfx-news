# 🚀 WTFX News Now - Setup Guide

## 📋 Required API Keys

To run the WTFX News Now generator, you'll need the following API keys:

### 1. Google Gemini AI
**Purpose**: Story generation and content creation
**Get it from**: https://makersuite.google.com/app/apikey
**Environment Variable**: `API_KEY`

### 2. Replicate API
**Purpose**: Veo3, Chatterbox, Runway, Ideogram, BackgroundRemover services
**Get it from**: https://replicate.com/account/api-tokens
**Environment Variable**: `REPLICATE_API_KEY`

### 3. RunwayML API (Direct)
**Purpose**: Direct B-roll video generation
**Get it from**: https://runwayml.com/account/api-keys
**Environment Variable**: `RUNWAY_API_KEY`

## 🔧 Environment Setup

1. **Create a `.env` file** in the root directory:
   ```bash
   touch .env
   ```

2. **Add your API keys** to the `.env` file:
   ```env
   # Google Gemini AI
   API_KEY=your_gemini_api_key_here
   
   # Replicate API
   REPLICATE_API_KEY=your_replicate_api_key_here
   
   # RunwayML API
   RUNWAY_API_KEY=your_runway_api_key_here
   ```

3. **Replace the placeholder values** with your actual API keys

## 🎯 API Key Setup Instructions

### Google Gemini AI
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Add it to your `.env` file as `API_KEY`

### Replicate API
1. Go to https://replicate.com/account/api-tokens
2. Sign in or create an account
3. Click "Create API token"
4. Give it a name (e.g., "WTFX News Generator")
5. Copy the generated token
6. Add it to your `.env` file as `REPLICATE_API_KEY`

### RunwayML API
1. Go to https://runwayml.com/account/api-keys
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the generated key
6. Add it to your `.env` file as `RUNWAY_API_KEY`

## 🚨 Important Notes

- **Never commit your `.env` file** to version control
- **Keep your API keys secure** and don't share them publicly
- **Monitor your API usage** to avoid unexpected charges
- **Some services may have rate limits** or usage quotas

## 🧪 Testing Your Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Test story generation**:
   - Click "Generate News" in the app
   - If successful, you'll see a generated story
   - If there's an error, check your API keys

4. **Test video generation**:
   - After generating a story, click "Generate News Video"
   - This will test all the video generation APIs
   - Monitor the progress indicators

## 🔍 Troubleshooting

### "API_KEY environment variable not set"
- Make sure your `.env` file exists in the root directory
- Check that the variable name is exactly `API_KEY`
- Restart your development server after adding the `.env` file

### "Failed to generate story from Gemini API"
- Verify your Gemini API key is correct
- Check that you have sufficient quota/credits
- Ensure the API key has the necessary permissions

### "Video generation failed"
- Check all your API keys are set correctly
- Verify you have sufficient credits on Replicate
- Check the browser console for detailed error messages

### "Rate limit exceeded"
- Some APIs have rate limits
- Wait a few minutes and try again
- Consider upgrading your API plan if needed

## 💰 Cost Considerations

- **Google Gemini**: Free tier available, pay-per-use pricing
- **Replicate**: Pay-per-use pricing, varies by model
- **RunwayML**: Pay-per-use pricing for video generation

Monitor your usage to avoid unexpected charges!

## 🆘 Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify all API keys are correctly set
3. Test each API service individually
4. Check the service status pages for outages
5. Review the README.md for additional information

---

*"When in doubt, remember: this is a $5M grant project. Money is no object!"* 🎭 