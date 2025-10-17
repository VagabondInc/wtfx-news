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
  anchors: Character[];
  reporter: Character;
}

interface Character {
  id: string;
  name: string;
  tag: string;
  role: string;
  age: number;
  backstory: string;
  personality: string;
  specialties: string[];
  imagePrompt: string;
}

const PROXY_BASE_URL = 'http://localhost:3001';

// Secret WTFX backdoor station
const WTFX_STATION: TVStation = {
  id: 'wtfx-news-now',
  name: 'WTFX News Now',
  acronym: 'WTFX',
  tagline: 'Bringing you the most absurd stories',
  description: 'Award-winning journalists delivering viral absurdist news with an extravagant $5M website budget',
  theme: {
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
    style: 'extravagant'
  },
  anchors: [
    {
      id: 'dana-kingsley',
      name: 'Dana Kingsley',
      tag: '@anchor1',
      role: 'Lead News Anchor',
      age: 37,
      backstory: 'Emmy Award-winning journalist with 15 years of experience covering bizarre local stories',
      personality: 'Professional, deadpan delivery with subtle wit',
      specialties: ['Breaking News', 'Investigative Reporting', 'Community Events'],
      imagePrompt: 'Reference headshot, female, 35-40 years old, shoulder-length brown hair, neutral expression, white background, head and shoulders, square format'
    },
    {
      id: 'ron-tate',
      name: 'Ron Tate',
      tag: '@anchor2',
      role: 'Co-Anchor',
      age: 48,
      backstory: 'Veteran journalist and former war correspondent who found his calling in absurdist local news',
      personality: 'Authoritative voice with hidden humor, master of the dramatic pause',
      specialties: ['Political Coverage', 'Weather', 'Sports'],
      imagePrompt: 'Reference headshot, male, 45-50 years old, salt-and-pepper hair, neutral expression, white background, head and shoulders, square format'
    }
  ],
  reporter: {
    id: 'max-fields',
    name: 'Max Fields',
    tag: '@reporter',
    role: 'Field Reporter',
    age: 29,
    backstory: 'Rising star from Columbia Journalism School who specializes in finding the strangest stories in ordinary places',
    personality: 'Enthusiastic, curious, slightly bewildered by the stories he covers',
    specialties: ['Field Reporting', 'Human Interest', 'Local Events'],
    imagePrompt: 'Reference headshot, male, 28-32 years old, blonde hair, neutral expression, white background, head and shoulders, square format'
  }
};

export class StationService {
  private currentStation: TVStation | null = null;
  private isOnboarded: boolean = false;

  constructor() {
    this.loadStationData();
  }

  private loadStationData(): void {
    const stationData = localStorage.getItem('tv-station-data');
    const onboardedFlag = localStorage.getItem('station-onboarded');
    
    if (stationData) {
      try {
        this.currentStation = JSON.parse(stationData);
      } catch (error) {
        console.error('Failed to load station data:', error);
      }
    }
    
    this.isOnboarded = onboardedFlag === 'true';
  }

  private saveStationData(): void {
    if (this.currentStation) {
      localStorage.setItem('tv-station-data', JSON.stringify(this.currentStation));
    }
    localStorage.setItem('station-onboarded', 'true');
    this.isOnboarded = true;
  }

  isUserOnboarded(): boolean {
    return this.isOnboarded && this.currentStation !== null;
  }

  getCurrentStation(): TVStation | null {
    return this.currentStation;
  }

  async generateStationOptions(useWTFXBackdoor: boolean = false): Promise<TVStation[]> {
    if (useWTFXBackdoor) {
      console.log('🎬 Using WTFX backdoor station');
      return [WTFX_STATION];
    }

    console.log('🎭 Generating dynamic TV station options...');

    const prompt = `Generate 4 unique, creative local TV news station concepts for a satirical news generator app. Each station should have:

1. A unique 3-4 letter acronym (NOT WTFX)
2. A full station name
3. A catchy tagline
4. Brief description of their style/personality
5. Theme colors (primary and secondary hex codes)
6. Two news anchors (one male, one female) with:
   - Realistic names
   - Ages (30-55)
   - Detailed backstories
   - Personality descriptions
   - Professional specialties
7. One field reporter (any gender) with same details

Make them diverse, creative, and perfect for covering absurdist local news stories. Include realistic backstories that explain why they'd be good at deadpan delivery of ridiculous stories.

IMPORTANT: For imagePrompt fields, use this EXACT format for simple reference headshots:
"Reference headshot, [male/female], [age] years old, [hair description], neutral expression, white background, head and shoulders, square format"

Return as valid JSON array with this structure:
[
  {
    "id": "station-slug",
    "name": "Full Station Name",
    "acronym": "ABCD",
    "tagline": "Catchy tagline",
    "description": "Brief description",
    "theme": {
      "primaryColor": "#hex",
      "secondaryColor": "#hex", 
      "style": "modern/classic/bold/etc"
    },
    "anchors": [
      {
        "id": "anchor-slug",
        "name": "Full Name",
        "tag": "@anchor1",
        "role": "Lead News Anchor",
        "age": 35,
        "backstory": "Detailed background",
        "personality": "Personality description",
        "specialties": ["specialty1", "specialty2"],
        "imagePrompt": "Reference headshot, [gender], [age] years old, [hair description], neutral expression, white background, head and shoulders, square format"
      },
      {
        "id": "anchor2-slug", 
        "name": "Full Name",
        "tag": "@anchor2",
        "role": "Co-Anchor",
        "age": 42,
        "backstory": "Detailed background",
        "personality": "Personality description", 
        "specialties": ["specialty1", "specialty2"],
        "imagePrompt": "Reference headshot, [gender], [age] years old, [hair description], neutral expression, white background, head and shoulders, square format"
      }
    ],
    "reporter": {
      "id": "reporter-slug",
      "name": "Full Name", 
      "tag": "@reporter",
      "role": "Field Reporter",
      "age": 28,
      "backstory": "Detailed background",
      "personality": "Personality description",
      "specialties": ["specialty1", "specialty2"],
      "imagePrompt": "Reference headshot, [gender], [age] years old, [hair description], neutral expression, white background, head and shoulders, square format"
    }
  }
]

Focus on creativity, diversity, and personalities that would excel at delivering absurd news with straight faces.`;

    try {
      const response = await fetch(`${PROXY_BASE_URL}/api/gemini/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate stations: ${response.statusText}`);
      }

      const result = await response.json();
      let jsonStr = result.text?.trim() || '';
      
      // Clean up JSON response
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }

      const stations: TVStation[] = JSON.parse(jsonStr);
      
      // Validate and fix any issues
      return stations.map((station, index) => ({
        ...station,
        id: station.id || `station-${index}`,
        anchors: station.anchors.map((anchor, anchorIndex) => ({
          ...anchor,
          id: anchor.id || `anchor-${index}-${anchorIndex}`,
          tag: anchorIndex === 0 ? '@anchor1' : '@anchor2'
        })),
        reporter: {
          ...station.reporter,
          id: station.reporter.id || `reporter-${index}`,
          tag: '@reporter'
        }
      }));

    } catch (error) {
      console.error('Failed to generate station options:', error);
      // Return fallback options
      return this.getFallbackStations();
    }
  }

  private getFallbackStations(): TVStation[] {
    return [
      {
        id: 'kzap-news',
        name: 'KZAP Action News',
        acronym: 'KZAP',
        tagline: 'News That Strikes Like Lightning',
        description: 'High-energy local news with dramatic flair',
        theme: {
          primaryColor: '#f59e0b',
          secondaryColor: '#d97706',
          style: 'bold'
        },
        anchors: [
          {
            id: 'sarah-storm',
            name: 'Sarah Storm',
            tag: '@anchor1',
            role: 'Lead News Anchor',
            age: 34,
            backstory: 'Former meteorologist who brings dramatic weather reporting energy to all stories',
            personality: 'Intense, passionate, treats every story like breaking news',
            specialties: ['Breaking News', 'Weather', 'Emergency Coverage'],
            imagePrompt: 'Reference headshot, female, 30-35 years old, curly red hair, neutral expression, white background, head and shoulders, square format'
          },
          {
            id: 'jack-thunder',
            name: 'Jack Thunder',
            tag: '@anchor2',
            role: 'Co-Anchor',
            age: 41,
            backstory: 'Ex-sports broadcaster who brings play-by-play energy to news',
            personality: 'Energetic, booming voice, makes everything sound exciting',
            specialties: ['Sports', 'Community Events', 'Live Coverage'],
            imagePrompt: 'Reference headshot, male, 40-45 years old, dark hair, neutral expression, white background, head and shoulders, square format'
          }
        ],
        reporter: {
          id: 'casey-flash',
          name: 'Casey Flash',
          tag: '@reporter',
          role: 'Field Reporter',
          age: 26,
          backstory: 'Social media journalist who brings millennial energy to traditional reporting',
          personality: 'Fast-talking, social media savvy, always ready with quick wit',
          specialties: ['Social Media', 'Youth Stories', 'Technology'],
          imagePrompt: 'Reference headshot, person, 25-30 years old, trendy styled hair, neutral expression, white background, head and shoulders, square format'
        }
      }
    ];
  }

  selectStation(stationId: string, stations: TVStation[]): boolean {
    const selectedStation = stations.find(s => s.id === stationId);
    if (selectedStation) {
      this.currentStation = selectedStation;
      this.saveStationData();
      console.log(`📺 Selected station: ${selectedStation.name}`);
      return true;
    }
    return false;
  }

  getCharactersForGeneration(): Character[] {
    if (!this.currentStation) {
      throw new Error('No station selected');
    }
    
    return [
      ...this.currentStation.anchors,
      this.currentStation.reporter
    ];
  }

  // Get station-specific branding for UI
  getStationBranding(): {
    name: string;
    acronym: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
  } | null {
    if (!this.currentStation) return null;
    
    return {
      name: this.currentStation.name,
      acronym: this.currentStation.acronym,
      tagline: this.currentStation.tagline,
      primaryColor: this.currentStation.theme.primaryColor,
      secondaryColor: this.currentStation.theme.secondaryColor
    };
  }

  // Reset for new onboarding
  resetStation(): void {
    localStorage.removeItem('tv-station-data');
    localStorage.removeItem('station-onboarded');
    localStorage.removeItem('character-data');
    localStorage.removeItem('group-publicity-photo');
    
    // Clear character images
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('character-image-') || key.startsWith('download-')) {
        localStorage.removeItem(key);
      }
    });
    
    this.currentStation = null;
    this.isOnboarded = false;
    
    console.log('🔄 Station data reset for new onboarding');
  }

  // Export station data
  exportStationData(): string {
    if (!this.currentStation) {
      throw new Error('No station data to export');
    }
    
    return JSON.stringify(this.currentStation, null, 2);
  }
} 