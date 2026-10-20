import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'missing-service-role-key'
const options = { auth: { persistSession: false, autoRefreshToken: false } }

// Service-role client: bypasses RLS, so every route checks ownership and role itself.
export const db = createClient(url, serviceKey, options)

// Throwaway client for checking a password without touching any shared session (S1-03).
export const freshClient = () => createClient(url, serviceKey, options)

export const RESOURCE_BUCKET = 'resource-files'
