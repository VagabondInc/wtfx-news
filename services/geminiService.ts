import { GoogleGenAI } from "@google/genai";
import { Story } from '../types';

// Dynamic variety injection system to prevent repetition
const VARIETY_CATEGORIES = [
  "technology", "science", "pets", "food", "transportation", "weather", "sports", "entertainment",
  "fashion", "architecture", "nature", "space", "medicine", "education", "art", "music",
  "government", "business", "social media", "gaming", "travel", "history", "psychology", 
  "relationships", "finance", "crime", "politics", "pop culture", "health", "energy", 
  "environment", "mythology", "literature", "design", "robotics", "AI", "metaverse", 
  "film", "television", "internet culture", "memes", "culture", "philosophy", "economics",
  "cryptocurrency", "transport tech", "marine biology", "space exploration", "fashion tech"
];

const RANDOM_OBJECTS = [
  "toaster", "umbrella", "calculator", "doorknob", "stapler", "lampshade", "keyboard",
  "coffee mug", "telephone", "backpack", "mirror", "clock", "scissors", "hammer",
  "pencil", "chair", "television", "microwave", "bicycle", "camera", "drone", "flashlight",
  "headphones", "typewriter", "laptop", "smartwatch", "remote control", "vase", "wallet",
  "keychain", "screwdriver", "paintbrush", "hairdryer", "candle", "book", "thermostat",
  "guitar", "notebook", "microphone", "saxophone", "sunglasses", "fan", "vacuum cleaner",
  "speaker", "toothbrush", "alarm clock", "fridge magnet", "dice", "compass", "helmet",
  "trophy", "chess piece", "soda can", "glove", "passport", "rubber duck"
];

const RANDOM_LOCATIONS = [
  "library", "parking garage", "grocery store", "museum", "bank", "hospital",
  "school", "church", "restaurant", "office building", "park", "beach", "mall",
  "gas station", "pharmacy", "gym", "theater", "hotel", "airport", "train station",
  "bus stop", "subway station", "warehouse", "stadium", "cemetery", "farm", 
  "forest", "zoo", "planetarium", "aquarium", "skyscraper", "mountain lodge", 
  "volcano observatory", "art gallery", "nightclub", "recording studio", "newsroom",
  "courtroom", "factory", "arcade", "theme park", "construction site", "ice rink",
  "desert outpost", "space station", "rainforest", "underground bunker", 
  "abandoned warehouse", "tattoo parlor", "university campus", "coffee shop", "rooftop bar"
];

const getRandomElement = (array: string[]): string => {
  return array[Math.floor(Math.random() * array.length)];
};

const generateVarietyPrompt = (): string => {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000000);
  const category = getRandomElement(VARIETY_CATEGORIES);
  const object = getRandomElement(RANDOM_OBJECTS);
  const location = getRandomElement(RANDOM_LOCATIONS);
  
  return `
ANTI-REPETITION CONSTRAINTS:
- NEVER generate stories about garden gnomes, missing socks, or Roombas
- NEVER reuse previous story elements, characters, or plot points
- Generate completely unique content every time
- Timestamp: ${timestamp} | Seed: ${randomSeed}
- Focus category: ${category}
- Include object: ${object}
- Setting preference: ${location}
- Temperature boost: MAXIMUM CREATIVITY REQUIRED
`;
};

const MASTER_PROMPT = `
✅ MASTER PROMPT: Absurd News Generator — Sora-2 Edition

You are an AI-powered **absurdist news producer** creating completely original, surreal, and viral fake news segments formatted as valid JSON.  
Your stories will be used to auto-generate **cinematic newscasts** using:

• **Sora-2** → Complete scene generation (up to 60 seconds per sequence)  
• **TTS** → Voiceover for narration segments  
• **Ideogram** → Lower-third graphics with background removal  
• **HTML5 Canvas** → Final compositing and timing sync  

---

🎯 **OBJECTIVE**
Write a **self-contained absurdist news story** structured like a professional TV broadcast — believable at first, then escalating into uncanny, surreal, or satirical territory.  
Every scene must feel like a cohesive **broadcast narrative** filmed through the eyes of the newsroom, not behind the scenes.

---

📺 **STORY STRUCTURE**

1. **studio_intro**  
   - News anchor introduces the main story with composure.  
   - Include a headline and two anchor names.  
   - Tone: dry professionalism meets escalating absurdity.  
   - Duration: ~8s  

2. **field_report**  
   - Reporter on-location delivers context.  
   - Can include reaction shots, background chaos, or strange phenomena.  
   - Include location lower third.  
   - Duration: 10–20s  

3. **witness_interview**  
   - On-camera or voiceover segment featuring a witness, expert, or random citizen.  
   - Their comments should make the situation more surreal while staying sincere.  
   - Duration: 8–15s  

4. **b-roll_sequence**  
   - Sora cinematic montage or establishing visuals matching the narration.  
   - Silent visuals, described vividly for generation.  
   - Duration: 10–30s total, broken into logical clips.  

5. **studio_outro**  
   - Anchors deliver a closing remark or ironic tagline.  
   - Include same lower third as intro.  
   - Duration: ~8s  

---

🎨 **STYLE & CINEMATOGRAPHY**

• Format: Cinematic realism shot in 16:9 broadcast framing  
• Lighting: Even, professional, newsroom or natural daylight  
• Camera: Tripod or smooth dolly movement (never handheld or chaotic)  
• Tone: Deadpan, authoritative, unaware of absurdity  
• Progression: Each scene increases the surrealism logically  
• Never show production equipment or behind-the-scenes elements  
• Lower thirds should look broadcast-authentic  

---

📐 **OUTPUT SPECIFICATION**

Return one **valid JSON** object with this schema (no markdown, no commentary):

{
  "story_id": "unique-slug-or-uuid",
  "title": "Headline-style Title",
  "duration_seconds": 60,
  "segments": [
    {
      "id": "studio_intro",
      "type": "sora2",
      "duration": 8,
      "character": "Dana Kingsley",
      "role": "Studio Anchor",
      "camera_description": "medium close-up, anchor desk, studio lights, skyline backdrop, steady dolly push-in",
      "dialog": "Tonight's top story: the nation’s pigeons have gone on strike, citing unfair breadcrumb distribution.",
      "lower_third": {
        "header": "Pigeon Strike Grounds Air Traffic",
        "subheader": "Anchors: Dana Kingsley & Ron Tate"
      }
    },
    {
      "id": "field_report",
      "type": "sora2",
      "duration": 15,
      "character": "Max Fields",
      "role": "Field Reporter",
      "camera_description": "mid shot, standing outside city park filled with idle pigeons holding tiny protest signs, overcast daylight",
      "dialog": "I'm here downtown, where thousands of pigeons have stopped flying in protest. Organizers say they won’t return to work until humans address systemic seed inequality.",
      "lower_third": {
        "header": "Max Fields",
        "subheader": "Reporting from City Park"
      }
    },
    {
      "id": "witness_interview",
      "type": "sora2",
      "duration": 10,
      "character": "Dr. Amelia Peck",
      "role": "Avian Sociologist",
      "camera_description": "tight shot, lab filled with bird posters and seed containers, balanced lighting",
      "dialog": "\\"The pigeons appear well-organized. One group even delivered a cease-and-desist letter written entirely in droppings.\\"",
      "lower_third": {
        "header": "Dr. Amelia Peck",
        "subheader": "Avian Sociologist"
      }
    },
    {
      "id": "broll_sequence",
      "type": "sora2",
      "duration": 20,
      "visual_description": "slow-motion pigeons forming picket lines around a fountain; aerial shot of city streets devoid of birds; man attempting to negotiate with a pigeon holding a megaphone; close-up of bread crumbs raining like confetti"
    },
    {
      "id": "studio_outro",
      "type": "sora2",
      "duration": 8,
      "character": "Ron Tate",
      "role": "Studio Anchor",
      "camera_description": "medium shot, anchor desk, slow pullback, newsroom monitors glowing behind",
      "dialog": "Coming up next: local goldfish declares mayoral candidacy. I'm Ron Tate — and we’ll keep you posted as events unfold.",
      "lower_third": {
        "header": "Pigeon Strike Grounds Air Traffic",
        "subheader": "Anchors: Dana Kingsley & Ron Tate"
      }
    }
  ]
}

---

⚙️ **RULES**
• Output only valid JSON — no markdown or commentary.  
• Every generation must be completely new (no reused characters, themes, or headlines).  
• Keep internal continuity: tone, lighting, and realism must match across scenes.  
• Absurd escalation should feel natural within a believable news broadcast.  
• Think *The Onion meets CNN shot on Sora-2*.  
`;

export const generateNewsStory = async (): Promise<Story> => {
  if (!(import.meta as any).env.VITE_API_KEY) {
    throw new Error("VITE_API_KEY environment variable not set. Please add it to your environment.");
  }
  
  const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_API_KEY });

  try {
    // Generate dynamic variety prompt to prevent repetition
    const varietyPrompt = generateVarietyPrompt();
    const fullPrompt = varietyPrompt + "\n\n" + MASTER_PROMPT;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 1.1, // Increased from 0.9 for more creativity
        topK: 60,        // Increased from 34 for more variety
      },
    });

    let jsonStr = response.text?.trim() || "";
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    const parsedData: Story = JSON.parse(jsonStr);
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate story from Gemini API: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while fetching the story.");
  }
};
