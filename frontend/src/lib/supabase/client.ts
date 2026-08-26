import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton pattern to avoid creating multiple clients
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    )
  }

  // Reuse existing client if available (singleton for browser)
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Optimize auth for faster session retrieval
      persistSession: true,
      autoRefreshToken: true,
      // Use localStorage for faster initial loads (vs cookies)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Reduce auth state change detection overhead
      detectSessionInUrl: false,
    },
  })

  return browserClient
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}
