import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env file if it exists
const envPath = resolve(import.meta.dirname || '.', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found.');
  console.error('Either set it with: export ELEVENLABS_API_KEY=your-api-key');
  console.error('Or add it to video/.env file: ELEVENLABS_API_KEY=your-key');
  process.exit(1);
}

const MODEL_ID = 'eleven_multilingual_v2';

const SCENES = [
  {
    id: '01-cold-open',
    text: 'Running fuel stations means drowning in paperwork, scattered data, and manual tracking. There has to be a better way.',
  },
  {
    id: '02-hero-dashboard',
    text: 'Meet Petro Astra. Your command center for every station. Revenue, liters, expenses, profit — everything updates in real-time. From tank levels to workforce stats, every metric at a glance.',
  },
  {
    id: '03-ask-astra-intro',
    text: 'Ask Astra is your AI analyst. Type any question. Want total sales? Ask. Need a trend chart? Ask. Unsure how to use a feature? Ask Astra guides you with smart navigation. Data queries, follow-ups, greetings, and how-to guidance — all powered by AI.',
  },
  {
    id: '04-ask-astra-results',
    text: 'Every response is intelligent. Simple questions get text. Data queries generate charts, tables, and metric cards. The system classifies your intent and chooses the best visualization automatically.',
  },
  {
    id: '05-click-astra',
    text: 'Click Astra turns any invoice or receipt into structured data. Upload or snap a photo. AI extracts every field automatically. Review, verify, export to Excel. Save templates for recurring documents. No more manual data entry.',
  },
  {
    id: '06-registration',
    text: 'Register your entire infrastructure in minutes. Stations, fuel types, tanks, pumps, nozzles, products — everything connected through an intelligent topology. Cascading dropdowns ensure data integrity.',
  },
  {
    id: '07-employee',
    text: 'Manage your entire workforce. Add employees with photo capture. Track shifts in real-time. Mark attendance with one click. Calendar view gives you the full picture.',
  },
  {
    id: '08-operations',
    text: 'Every daily operation, digitized. Update fuel prices, track trends. Record sales per nozzle with automatic calculations. Manage credit customers, transactions, and payments. Product sales, purchases, expenses, stock — all in one place.',
  },
  {
    id: '09-tech-stack',
    text: 'Built on enterprise technology. Next.js for instant navigation. FastAPI and LangGraph for intelligent AI. Supabase for secure data. Performance you can feel.',
  },
  {
    id: '10-closing',
    text: 'Petro Astra. Ask. Analyze. Accelerate. Start your free trial today.',
  },
];

// Auto-detect an available voice for this API key
async function getVoiceId(): Promise<string> {
  console.log('Detecting available voices...');

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json() as { voices: { voice_id: string; name: string; category: string }[] };
  const voices = data.voices || [];

  if (voices.length === 0) {
    throw new Error('No voices available. Please add a voice in your ElevenLabs account.');
  }

  // Prefer: female English voices, then any premade, then first available
  const preferred = voices.find(
    (v) => v.name.toLowerCase().includes('rachel') || v.name.toLowerCase().includes('sarah')
  );
  const premade = voices.find((v) => v.category === 'premade');
  const selected = preferred || premade || voices[0];

  console.log(`Selected voice: ${selected.name} (${selected.voice_id}) [${selected.category}]`);
  console.log(`Total voices available: ${voices.length}`);
  return selected.voice_id;
}

async function generateVoiceover(
  voiceId: string,
  sceneId: string,
  text: string,
): Promise<void> {
  console.log(`Generating voiceover for: ${sceneId}`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `ElevenLabs API error for ${sceneId}: ${response.status} - ${error}`,
    );
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const outputPath = `public/voiceover/petro-astra-promo/${sceneId}.mp3`;
  writeFileSync(outputPath, audioBuffer);
  console.log(
    `  Saved: ${outputPath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`,
  );
}

async function main(): Promise<void> {
  const outputDir = 'public/voiceover/petro-astra-promo';
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const voiceId = await getVoiceId();

  console.log(`\nGenerating ${SCENES.length} voiceover files...`);
  console.log(`Model: ${MODEL_ID}\n`);

  for (const scene of SCENES) {
    await generateVoiceover(voiceId, scene.id, scene.text);
    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\nAll voiceover files generated successfully!');
}

main().catch((error) => {
  console.error('Failed to generate voiceover:', error);
  process.exit(1);
});
