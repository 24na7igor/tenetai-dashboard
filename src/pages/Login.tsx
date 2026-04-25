import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err: any) {
      setError(err.message ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian-950">
      {/* Grid background */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      {/* Aurora orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/[0.07] rounded-full blur-3xl pointer-events-none animate-aurora-a" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neptune-500/[0.05] rounded-full blur-3xl pointer-events-none animate-aurora-b" />

      <div className="relative max-w-sm w-full px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl" />
              <img src="/favicon.svg" alt="Tenet AI" className="relative h-14 w-14 rounded-2xl" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Tenet AI</h1>
          <p className="mt-1.5 text-sm text-slate-500">AI governance · audit dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-obsidian-900 border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 text-center mb-5">
              Sign in to your workspace
            </p>

            {/* Username */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="tenet-admin"
                className="w-full bg-obsidian-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-obsidian-950 border border-white/[0.08] rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 bg-signal-500/10 border border-signal-500/20 rounded-lg">
                <p className="text-xs text-signal-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors mt-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-center gap-2 text-xs text-slate-600">
            <Shield className="h-3 w-3 text-neptune-500" />
            <span>Enterprise audit trail for AI agents</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}
