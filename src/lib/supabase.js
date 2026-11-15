import { createClient } from '@supabase/supabase-js'
import { configurationError } from './runtime'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = configurationError
  ? null
  : createClient(url, anonKey, { auth: { flowType: 'pkce' } })
