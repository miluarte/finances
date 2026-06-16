import { createClient } from '@supabase/supabase-js'

const supabaseUrl      = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. ' +
    'Copie .env.example para .env e preencha com os dados do seu projeto.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

// Cliente admin — usa service role key, bypassa RLS. Só para operações de admin.
let supabaseAdmin = null
try {
  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl ?? '', supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
} catch (e) {
  console.warn('[Supabase] Admin client não inicializado:', e.message)
}
export { supabaseAdmin }

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async fu