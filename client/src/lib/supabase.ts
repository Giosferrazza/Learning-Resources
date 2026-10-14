import { createClient } from '@supabase/supabase-js'

// Set these in client/.env.local (see client/.env.example)
const url = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'missing-anon-key'

export const supabase = createClient(url, anonKey)
