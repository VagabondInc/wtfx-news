import { DownloadService } from './downloadService';
import { LogoService } from './logoService';
import { DriveService } from './driveService';

const PROXY_BASE_URL = 'http://localhost:3001';

interface Character {
  id: string;
  name: string;
  tag: string;
  role: string;
  prompt: string;
  imageUrl?: string;
  localPath?: string;
}

export class CharacterService {
  private downloadService = new DownloadService();
  private logoService = new LogoService();
  private drive = new DriveService();
  private characters: Character[] = [
    {
      id: 'dana-kingsley',
      name: 'Dana Kingsley',
      tag: '@anchor1',
      role: 'Lead News Anchor',
      prompt: 'Professional female news anchor, 35-40 years old, shoulder-length brown hair, wearing navy blue blazer, white background, studio lighting, headshot, realistic, high definition, professional photography'
    },
    {
      id: 'ron-tate',
      name: 'Ron Tate', 
      tag: '@anchor2',
      role: 'Co-Anchor',
      prompt: 'Professional male news anchor, 45-50 years old, salt-and-pepper hair, wearing dark suit with red tie, white background, studio lighting, headshot, realistic, high definition, professional photography'
    },
    {
      id: 'max-fields',
      name: 'Max Fields',
      tag: '@reporter',
      role: 'Field Reporter',
      prompt: 'Young male field reporter, 28-32 years old, blonde hair, wearing casual button-down shirt, white background, studio lighting, headshot, realistic, high definition, professional photography'
    }
  ];

  async generateAllCharacterImages(): Promise<void> {
    console.log('🎭 Generating character reference images...');
    
    for (const character of this.characters) {
      try {
        console.log(`Generating image for ${character.name} (${character.tag})...`);
        
        const imageUrl = await this.generateCharacterImage(character.prompt);
        character.imageUrl = imageUrl;
        
        // Download and save locally using download service
        const localPath = await this.downloadService.downloadCharacterAssets(character.id, imageUrl);
        character.localPath = localPath;
        
        console.log(`✅ Generated ${character.name}: ${localPath}`);
        
        // Wait between generations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to generate image for ${character.name}:`, error);
      }
    }
    
    // Generate group publicity photo
    console.log('📸 Generating group publicity photo...');
    try {
      await this.generateGroupPublicityPhoto();
      console.log('✅ Group publicity photo generated!');
    } catch (error) {
      console.error('❌ Failed to generate group photo:', error);
    }
    
    // Save character data to localStorage
    this.saveCharacterData();
    console.log('🎉 All character images generated and saved!');
  }

  private async generateGroupPublicityPhoto(): Promise<void> {
    // Get all character image URLs
    const characterImages = this.characters
      .map(char => char.imageUrl)
      .filter(url => url) as string[];

    if (characterImages.length < 3) {
      throw new Error('Not enough character images to generate group photo');
    }

    // Create a prompt for the group photo that works well for website integration
    const groupPrompt = `Professional TV news team publicity photo, three journalists standing together in a modern news studio, clean white background, professional studio lighting, confident poses, business professional attire, high definition photography, suitable for website header, broadcast quality team photo, corporate style`;

    try {
      // Use character images as references for the group photo
      const groupImageUrl = await this.generateCharacterImage(groupPrompt, characterImages);
      
      // Save group photo using download service
      await this.downloadService.downloadAndSaveAsset(groupImageUrl, 'image', {
        customFileName: 'group-publicity-photo'
      });
      try { await this.drive.saveKV('station-assets', { groupPhotoUrl: groupImageUrl }, 'stories'); } catch {}
      try { window.dispatchEvent(new CustomEvent('station-assets-updated', { detail: { groupPhotoUrl: groupImageUrl } })); } catch {}
      
      console.log('✅ Group publicity photo saved');
    } catch (error) {
      console.error('Failed to generate group photo:', error);
    }
  }

  async generateSingleCharacterImage(tag: string, name: string, prompt: string): Promise<string> {
    console.log(`🎭 Generating image for ${name} (${tag})...`);
    
    try {
      // Load any existing character data to avoid duplicate generation
      this.loadCharacterData();
      const existing = this.getCharacterByTag(tag);
      if (existing && (existing.localPath || existing.imageUrl)) {
        const existingUrl = this.getCharacterImageUrlByTag(tag);
        if (existingUrl) {
          console.log(`✅ Character image already exists for ${name}; skipping regeneration`);
          return existingUrl;
        }
      }

      // Process the prompt to ensure proper headshot format
      const processedPrompt = this.createProfessionalHeadshotPrompt(prompt, name);
      console.log(`📝 Using processed prompt: ${processedPrompt}`);
      
      const imageUrl = await this.generateCharacterImage(processedPrompt);
      
      // Update character data
      const character = this.characters.find(c => c.tag === tag);
      if (character) {
        character.imageUrl = imageUrl;
        character.name = name;
        character.prompt = prompt;
      } else {
        // Add new character
        this.characters.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          tag,
          role: tag === '@anchor1' ? 'Lead News Anchor' : tag === '@anchor2' ? 'Co-Anchor' : 'Field Reporter',
          prompt,
          imageUrl
        });
      }
      
              // Download and save locally
        const characterId = name.toLowerCase().replace(/\s+/g, '-');
        console.log(`💾 Downloading character image for ${characterId}...`);
        const localPath = await this.downloadService.downloadCharacterAssets(characterId, imageUrl);
        console.log(`📁 Character image saved to: ${localPath}`);
        
        if (character) {
          character.localPath = localPath;
        } else {
          // Update the new character we just added
          const newCharacter = this.characters.find(c => c.tag === tag);
          if (newCharacter) {
            newCharacter.localPath = localPath;
          }
        }
      
      this.saveCharacterData();
      console.log(`✅ Generated ${name}: ${localPath}`);
      
      return imageUrl;
    } catch (error) {
      console.error(`❌ Failed to generate image for ${name}:`, error);
      throw error;
    }
  }

  async generateGroupPhoto(): Promise<void> {
    console.log('📸 Generating group publicity photo...');
    try {
      await this.generateGroupPublicityPhoto();
      console.log('✅ Group publicity photo generated!');
    } catch (error) {
      console.error('❌ Failed to generate group photo:', error);
      throw error;
    }
  }

  async generateStationAssets(stationName: string, acronym: string, tagline: string, existingLogoUrl?: string): Promise<{
    logoUrl: string;
    teamPhotoNoBgUrl: string;
  }> {
    console.log('🎨 Generating station assets (logo + team photo)...');
    
    try {
      // Determine station logo (reuse existing if provided or already saved)
      let kv: any = null;
      try { kv = await this.drive.getKV('station-assets', 'stories'); } catch {}
      let logoUrl = existingLogoUrl || kv?.logoUrl || '';
      if (logoUrl) {
        console.log('🖼️ Using existing station logo');
      } else {
        console.log('🖼️ Step 1: Generating station logo...');
        logoUrl = await this.logoService.generateStationLogo(stationName, acronym, tagline);
      }
      
      // Get team photo and remove background
      const teamPhoto: string | null = kv?.groupPhotoUrl || null;
      if (!teamPhoto) {
        throw new Error('No team photo available to process');
      }
      
      console.log('🖼️ Step 2: Removing background from team photo...');
      const teamPhotoNoBgUrl = await this.logoService.removeBackground(teamPhoto);
      
      // Save both assets (logo may already be present; still persist mapping best-effort)
      try {
        await this.downloadService.downloadAndSaveAsset(logoUrl, 'image', {
          customFileName: 'station-logo'
        });
      } catch {}
      
      await this.downloadService.downloadAndSaveAsset(teamPhotoNoBgUrl, 'image', {
        customFileName: 'team-photo-no-bg'
      });
      try { await this.drive.saveKV('station-assets', { ...(kv || {}), logoUrl, teamPhotoNoBgUrl }, 'stories'); } catch {}
      try { window.dispatchEvent(new CustomEvent('station-assets-updated', { detail: { logoUrl, teamPhotoNoBgUrl } })); } catch {}
      
      console.log('✅ Station assets generated and saved!');
      
      return {
        logoUrl,
        teamPhotoNoBgUrl
      };
    } catch (error) {
      console.error('❌ Failed to generate station assets:', error);
      throw error;
    }
  }

  private createProfessionalHeadshotPrompt(originalPrompt: string, characterName: string): string {
    // Extract basic characteristics for a simple reference image
    const isFemaleName = /^(Dana|Sarah|Casey|Maria|Jennifer|Lisa|Michelle|Jessica|Amanda|Emily|Ashley|Rachel|Samantha|Nicole|Elizabeth|Catherine|Susan|Helen|Karen|Nancy|Betty|Dorothy|Sandra|Donna|Carol|Ruth|Sharon|Michelle|Laura|Kimberly|Deborah|Dorothy|Nancy|Karen|Betty|Helen|Sandra|Donna|Carol|Ruth|Sharon)/.test(characterName);
    const isMaleName = /^(Ron|Max|Jack|Michael|Christopher|Matthew|Joshua|David|Daniel|Andrew|James|Joseph|John|Robert|Mark|Paul|Steven|Kenneth|Kevin|Brian|George|Edward|Ronald|Timothy|Jason|Jeffrey|Ryan|Jacob|Gary|Nicholas|Eric|Jonathan|Stephen|Larry|Justin|Scott|Brandon|Benjamin|Samuel|Gregory|Frank|Raymond|Alexander|Patrick|Jack|Dennis|Jerry|Tyler|Aaron|Jose|Henry|Adam|Douglas|Nathan|Peter|Zachary|Kyle|Noah|Alan|Ethan|Jeremy|Lionel|Mason|Luke|Arthur|Sean|Austin|Russell|Lawrence|Carl|Donald|Jordan|Billy|Bruce|Joe|Juan|Wayne|Roy|Ralph|Eugene|Louis|Philip|Bobby)/.test(characterName);
    
    const gender = isFemaleName ? 'female' : isMaleName ? 'male' : 'person';
    
    // Extract age from original prompt
    const ageMatch = originalPrompt.match(/(\d+)[-\s]*(\d+)?\s*years?\s*old/i);
    const age = ageMatch ? (ageMatch[2] ? `${ageMatch[1]}-${ageMatch[2]}` : ageMatch[1]) : '35-45';
    
    // Extract hair description
    const hairMatch = originalPrompt.match(/(brown|blonde|black|red|gray|grey|salt[- ]and[- ]pepper|dark|light|curly|straight|wavy|shoulder[- ]length|short|long)\s*(hair|haired)/i);
    const hairDescription = hairMatch ? hairMatch[0] : 'brown hair';
    
    // Simple reference headshot prompt - just the basics for consistent character recognition
    return `Reference headshot, ${gender}, ${age} years old, ${hairDescription}, neutral expression, looking at camera, white background, even lighting, head and shoulders, square format, clear facial features for reference`;
  }

  async generateCharacterImage(prompt: string, referenceImages?: string[]): Promise<string> {
    const body: any = {
      prompt,
      aspect_ratio: '1:1'
    };
    if (referenceImages && referenceImages.length > 0) {
      body.image_urls = referenceImages;
    }

    const response = await fetch(`${PROXY_BASE_URL}/api/segmind/nano-banana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Image generation error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    if (!result.imageUrl) throw new Error('No imageUrl in Segmind response');
    return result.imageUrl;
  }



  private saveCharacterData(): void {
    localStorage.setItem('character-data', JSON.stringify(this.characters));
  }

  loadCharacterData(): Character[] {
    const stored = localStorage.getItem('character-data');
    if (stored) {
      this.characters = JSON.parse(stored);
    }
    return this.characters;
  }

  getCharacterByTag(tag: string): Character | undefined {
    return this.characters.find(char => char.tag === tag);
  }

  getCharacterByName(name: string): Character | undefined {
    return this.characters.find(char => char.name === name);
  }

  getCharacterImageUrl(characterName: string): string | undefined {
    const character = this.getCharacterByName(characterName);
    if (character?.localPath) {
      // Try to get local file first
      const localUrl = this.downloadService.getLocalFileUrl(character.localPath);
      if (localUrl) return localUrl;
    }
    return character?.imageUrl;
  }

  getCharacterImageUrlByTag(tag: string): string | undefined {
    const character = this.getCharacterByTag(tag);
    if (character?.localPath) {
      // Try to get local file first
      const localUrl = this.downloadService.getLocalFileUrl(character.localPath);
      if (localUrl) return localUrl;
    }
    return character?.imageUrl;
  }

  getAllCharacters(): Character[] {
    return this.characters;
  }

  // getGroupPublicityPhoto is deprecated; station assets now come from Drive KV

  // Check if all character images have been generated
  areCharacterImagesReady(): boolean {
    return this.characters.every(char => char.imageUrl || char.localPath);
  }

  // Extract tags from a prompt and replace with character context
  processPromptWithTags(prompt: string): { prompt: string; referenceImages: string[] } {
    const tagRegex = /@(\w+)/g;
    const matches = prompt.match(tagRegex) || [];
    const referenceImages: string[] = [];
    let processedPrompt = prompt;

    matches.forEach(tag => {
      const character = this.getCharacterByTag(tag);
      if (character) {
        // Keep the tag in the prompt but add character name for clarity
        // Example: "@anchor1" becomes "@anchor1 (Dana Kingsley)" 
        processedPrompt = processedPrompt.replace(tag, `${tag} (${character.name})`);
        
        // Add reference image if available - try local first, then original URL
        const localImageUrl = this.getCharacterImageUrl(character.name);
        if (localImageUrl && !referenceImages.includes(localImageUrl)) {
          referenceImages.push(localImageUrl);
          console.log(`📎 Added reference image for ${character.name}: ${localImageUrl.substring(0, 50)}...`);
        } else if (character.imageUrl && !referenceImages.includes(character.imageUrl)) {
          // Fallback to original URL if local not available
          referenceImages.push(character.imageUrl);
          console.log(`📎 Added fallback reference image for ${character.name}: ${character.imageUrl}`);
        } else {
          console.warn(`⚠️ No reference image available for ${character.name} (${tag})`);
        }
      } else {
        console.warn(`⚠️ Character not found for tag: ${tag}`);
      }
    });

    console.log(`🎯 Processed prompt: "${processedPrompt}"`);
    console.log(`🖼️ Reference images (${referenceImages.length}):`, referenceImages.map(url => url.substring(0, 50) + '...'));

    return { prompt: processedPrompt, referenceImages };
  }
} 
