const PROXY_BASE_URL = 'http://localhost:3001';

export class LogoService {
  async generateStationLogo(stationName: string, acronym: string, tagline: string): Promise<string> {
    console.log(`🎨 Generating logo for ${stationName} (${acronym}) - ${tagline}`);
    
    const logoPrompt = `Professional TV news station logo for "${stationName}" with large bold "${acronym}" letters, satirical and exagerated *local news* style design, red and blue color scheme, broadcast television style, corporate branding, high quality vector-style or 3D rendering style logo, suitable for website header and station video branding, news channel branding, white/transparent background`;
    
    // Use Segmind Nano Banana for logos
    try {
      const requestBody = {
        prompt: logoPrompt,
        aspect_ratio: '16:9'
      };
      const imageUrl = await this.generateWithSegmindNanoBanana(requestBody, `logo generation for ${stationName}`);
      console.log(`✅ Segmind logo generation successful for ${stationName}`);
      return imageUrl;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log(`⚠️ Segmind logo generation failed after retries, using placeholder: ${errorMessage}`);
      return this.generatePlaceholderLogo(stationName, acronym);
    }
  }

  async generateStationGraphic(stationName: string, location: string): Promise<string> {
    console.log(`🏢 Generating station graphic for ${stationName} in ${location}`);
    
    const stationPrompt = `Professional TV news station building exterior for "${stationName}", exagerated and satirical *local news style* modern broadcast facility, glass facade with large station logo, news van parked outside, satellite dishes on roof, corporate headquarters style, daytime lighting, high quality architectural photography, ${location} cityscape background, make sure station branding is consistent throughout`;
    
    try {
      const requestBody = {
        prompt: stationPrompt,
        aspect_ratio: '16:9'
      };
      const imageUrl = await this.generateWithSegmindNanoBanana(requestBody, `station graphic generation for ${stationName}`);
      console.log(`✅ Segmind station graphic generation successful for ${stationName}`);
      return imageUrl;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log(`⚠️ Segmind station graphic generation failed after retries, using placeholder: ${errorMessage}`);
      return this.generatePlaceholderStation(stationName, location);
    }
  }

  private async generateWithSegmindNanoBanana(requestBody: Record<string, unknown>, description: string): Promise<string> {
    const maxAttempts = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔁 Retrying Segmind ${description} (attempt ${attempt}/${maxAttempts})`);
        }

        const response = await fetch(`${PROXY_BASE_URL}/api/segmind/nano-banana`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Segmind API error: ${response.status} - ${errorText}`);
        }

        const result: { imageUrl?: string } = await response.json();
        if (result.imageUrl) {
          return result.imageUrl;
        }

        throw new Error('No image URL found in Segmind response');
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delayMs = 1000 * attempt;
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️ Segmind ${description} attempt ${attempt} failed: ${message}. Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('Segmind request failed');
  }

  private generatePlaceholderLogo(stationName: string, acronym: string): string {
    console.log(`🎨 Generating placeholder logo for ${stationName} (${acronym})`);
    
    // Create a simple SVG logo as base64 data URL
    const svg = `
      <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="225" fill="url(#grad1)" rx="15"/>
        <text x="200" y="120" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
              text-anchor="middle" fill="white" stroke="black" stroke-width="1">
          ${acronym}
        </text>
        <text x="200" y="160" font-family="Arial, sans-serif" font-size="16" font-weight="normal" 
              text-anchor="middle" fill="white">
          ${stationName}
        </text>
        <rect x="10" y="10" width="380" height="205" fill="none" stroke="white" stroke-width="2" rx="10"/>
      </svg>
    `;
    
    const base64Svg = btoa(svg);
    return `data:image/svg+xml;base64,${base64Svg}`;
  }

  private generatePlaceholderStation(stationName: string, location: string): string {
    console.log(`🏢 Generating placeholder station graphic for ${stationName} in ${location}`);
    
    // Create a simple SVG station graphic as base64 data URL
    const svg = `
      <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="stationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="225" fill="url(#stationGrad)" rx="10"/>
        <rect x="50" y="80" width="300" height="100" fill="rgba(255,255,255,0.9)" rx="5"/>
        <text x="200" y="120" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
              text-anchor="middle" fill="#1e40af">
          ${stationName}
        </text>
        <text x="200" y="145" font-family="Arial, sans-serif" font-size="14" font-weight="normal" 
              text-anchor="middle" fill="#374151">
          Broadcasting from ${location}
        </text>
        <circle cx="80" cy="40" r="15" fill="#dc2626"/>
        <circle cx="120" cy="40" r="15" fill="#dc2626"/>
        <circle cx="160" cy="40" r="15" fill="#dc2626"/>
        <rect x="10" y="10" width="380" height="205" fill="none" stroke="white" stroke-width="2" rx="8"/>
      </svg>
    `;
    
    const base64Svg = btoa(svg);
    return `data:image/svg+xml;base64,${base64Svg}`;
  }



  async removeBackground(imageUrl: string): Promise<string> {
    console.log(`🖼️ Removing background from image: ${imageUrl.substring(0, 50)}...`);
    
    try {
      // Convert image URL to base64 if it's not already
      let base64Image: string;
      if (imageUrl.startsWith('data:image/')) {
        // Extract base64 data from data URL
        base64Image = imageUrl.split(',')[1];
      } else {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        base64Image = Buffer.from(imageBuffer).toString('base64');
      }

      const response = await fetch(`${PROXY_BASE_URL}/api/segmind/bg-removal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          image: base64Image,
          method: 'object'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Segmind background removal error: ${error.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (result.imageUrl) {
        console.log(`✅ Background removal successful`);
        return result.imageUrl;
      } else {
        throw new Error('No image URL found in Segmind background removal response');
      }
    } catch (error) {
      console.error('Failed to remove background:', error);
      throw error;
    }
  }

} 
