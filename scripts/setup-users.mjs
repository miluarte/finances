/**
 * setup-users.mjs
 * Cria usuários de teste no Supabase e configura roles.
 * Uso: node scripts/setup-users.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hrxwcbjfmqxzigykdlcs.supabase.co'
const ANON_KEY    = 'sb_publishable_4MGQMFZS5zdPh1Sw1F80SA_3iwEHiPA'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

const users = [
  { email: 'admin@familyfinance.com',  password: 'Familia@2025', full_name: 'Milena Admin',   role: 'admin'  },
  { email: 'membro@familyfinance.com', password: 'Familia@2025', full_name: 'João Membro',    role: 'member' },
]

async function createUser({ email, password, full_name, role }) {
  console.log(`\n→ Criando ${email}...`)

  // 1. Sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`  ⚠️  Usuário já existe — pulando signup.`)
    } else {
      console.error(`  ✗ Erro no signup: ${error.message}`)
      return
    }
  } else {
    console.log(`  ✓ Conta criada — id: ${data.user?.id}`)
  }

  // 2. Aguarda o trigger criar o perfil
  await new Promise(r => setTimeout(r, 1500))

  // 3. Atualiza role e nome no perfil
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ role, full_name })
    .eq('email', email)

  if (profileErr) {
    console.error(`  ✗ Erro ao atualizar perfil: ${profileErr.message}`)
    console.log(`  💡 Rode no SQL Editor: UPDATE public.profiles SET role = '${role}', full_name = '${full_name}' WHERE email = '${email}';`)
  } else {
    console.log(`  ✓ Perfil atualizado — role: ${role}`)
  }
}

console.log('═══════════════════════════════════════')
console.log('  FamilyFinance — Setup de Usuários')
console.log('═══════════════════════════════════════')

for (const u of users) {
  await createUser(u)
}

console.log('\n═══════════════════════════════════════')
console.log('✅ Concluído! Credenciais de acesso:')
console.log('───────────────────────────────────────')
users.forEach(u => console.log(`  ${u.role.padEnd(6)} │ ${u.email} │ ${u.password}`))
console.log('═══════════════════════════════════════\n')
