import { createClient } from '@supabase/supabase-js'

const supabaseUrl      = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao encontradas.')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

let supabaseAdmin = null
try {
  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl ?? '', supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
} catch (e) {
  console.warn('[Supabase] Admin client nao inicializado:', e.message)
}
export { supabaseAdmin }

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
