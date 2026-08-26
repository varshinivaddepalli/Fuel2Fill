export type SceneVoiceover = {
  id: string;
  text: string;
  audioFile: string;
};

export const SCENE_VOICEOVERS: SceneVoiceover[] = [
  {
    id: 'cold-open',
    text: 'Running fuel stations means drowning in paperwork, scattered data, and manual tracking. There has to be a better way.',
    audioFile: 'voiceover/petro-astra-promo/01-cold-open.mp3',
  },
  {
    id: 'hero-dashboard',
    text: 'Meet Petro Astra. Your command center for every station. Revenue, liters, expenses, profit — everything updates in real-time. From tank levels to workforce stats, every metric at a glance.',
    audioFile: 'voiceover/petro-astra-promo/02-hero-dashboard.mp3',
  },
  {
    id: 'ask-astra-intro',
    text: 'Ask Astra is your AI analyst. Type any question. Want total sales? Ask. Need a trend chart? Ask. Unsure how to use a feature? Ask Astra guides you with smart navigation. Data queries, follow-ups, greetings, and how-to guidance — all powered by AI.',
    audioFile: 'voiceover/petro-astra-promo/03-ask-astra-intro.mp3',
  },
  {
    id: 'ask-astra-results',
    text: 'Every response is intelligent. Simple questions get text. Data queries generate charts, tables, and metric cards. The system classifies your intent and chooses the best visualization automatically.',
    audioFile: 'voiceover/petro-astra-promo/04-ask-astra-results.mp3',
  },
  {
    id: 'click-astra',
    text: 'Click Astra turns any invoice or receipt into structured data. Upload or snap a photo. AI extracts every field automatically. Review, verify, export to Excel. Save templates for recurring documents. No more manual data entry.',
    audioFile: 'voiceover/petro-astra-promo/05-click-astra.mp3',
  },
  {
    id: 'registration',
    text: 'Register your entire infrastructure in minutes. Stations, fuel types, tanks, pumps, nozzles, products — everything connected through an intelligent topology. Cascading dropdowns ensure data integrity.',
    audioFile: 'voiceover/petro-astra-promo/06-registration.mp3',
  },
  {
    id: 'employee',
    text: 'Manage your entire workforce. Add employees with photo capture. Track shifts in real-time. Mark attendance with one click. Calendar view gives you the full picture.',
    audioFile: 'voiceover/petro-astra-promo/07-employee.mp3',
  },
  {
    id: 'operations',
    text: 'Every daily operation, digitized. Update fuel prices, track trends. Record sales per nozzle with automatic calculations. Manage credit customers, transactions, and payments. Product sales, purchases, expenses, stock — all in one place.',
    audioFile: 'voiceover/petro-astra-promo/08-operations.mp3',
  },
  {
    id: 'tech-stack',
    text: 'Built on enterprise technology. Next.js for instant navigation. FastAPI and LangGraph for intelligent AI. Supabase for secure data. Performance you can feel.',
    audioFile: 'voiceover/petro-astra-promo/09-tech-stack.mp3',
  },
  {
    id: 'closing',
    text: 'Petro Astra. Ask. Analyze. Accelerate. Start your free trial today.',
    audioFile: 'voiceover/petro-astra-promo/10-closing.mp3',
  },
];
