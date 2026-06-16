import { createClient } from '@supabase/supabase-js'

const supabaseUrl      = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao encontradas. ' +
    'Copie .env.example para .env e preencha com os dados do seu projeto.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

// Cliente admin - usa service role key, bypassa RLS. So para operacoes de admin.
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

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}
