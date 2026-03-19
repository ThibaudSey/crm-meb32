import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Turbopack may substitute undefined NEXT_PUBLIC_ vars as literal "undefined" string
function sanitizeEnv(val: string | undefined): string {
  if (!val || val === 'undefined') return ''
  return val
}

const supabaseUrl = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseKey = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!supabaseConfigured && typeof window !== 'undefined') {
  console.warn('[CRM MEB32] Variables Supabase manquantes. Vérifiez .env.local')
}

// Placeholder client when env vars not set — all requests will fail gracefully
let _client: SupabaseClient
try {
  _client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-anon-key',
  )
} catch {
  // Fallback no-op client for build-time SSR without env vars
  _client = {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      eq: () => Promise.resolve({ data: [], error: null }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
  } as unknown as SupabaseClient
}

export const supabase = _client
