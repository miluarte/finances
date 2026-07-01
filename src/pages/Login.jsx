import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Eye, EyeOff } from 'lucide-react'
import { signIn } from '@/lib/supabase'
import logo from '@/assets/logo.svg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message ?? 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="w-full h-[calc(100vh-16px)] flex gap-2">

        {/* Left panel — dark gradient */}
        <div
          className="hidden lg:flex flex-1 rounded-xl"
          style={{
            background: 'linear-gradient(to bottom, #272729, #09090B)',
          }}
        />

        {/* Right panel — login form */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="w-full max-w-[420px] flex flex-col gap-8">

            {/* Header */}
            <div className="flex flex-col items-center gap-5">
              <img src={logo} alt="Logo" className="w-16 h-16" />
              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-semibold text-[#09090B]">
                  Bem vindo de volta!
                </h1>
                <p className="text-sm text-[#525257]">
                  Insira seu email e sua senha para continuar.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#09090B]">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="milena@familia.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full h-11 rounded-xl border border-[#E4E4E7] bg-white px-3 pr-10 text-sm text-[#09090B] placeholder:text-[#A1A1AA] outline-none focus:ring-2 focus:ring-[#09090B]/20 focus:border-[#09090B] transition-all"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#09090B]">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full h-11 rounded-xl border border-[#E4E4E7] bg-white px-3 pr-10 text-sm text-[#09090B] placeholder:text-[#A1A1AA] outline-none focus:ring-2 focus:ring-[#09090B]/20 focus:border-[#09090B] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#09090B] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#09090B] hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 -mt-4">{error}</p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-[#09090B] text-white text-sm font-semibold hover:bg-[#272729] disabled:opacity-60 transition-colors"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  )
}
