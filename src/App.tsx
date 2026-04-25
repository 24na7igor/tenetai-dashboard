import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LogOut, ChevronDown, Building2, Crown, Sparkles, Zap } from 'lucide-react'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext'
import Dashboard from './pages/Dashboard'
import ExecutionDetail from './pages/ExecutionDetail'
import OverrideProof from './pages/OverrideProof'
import SessionTimeline from './pages/SessionTimeline'
import APIKeys from './pages/APIKeys'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import MockExecution from './pages/MockExecution'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-obsidian-950">
        <img src="/favicon.svg" alt="Tenet AI" className="h-10 w-10 animate-pulse opacity-60" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function TierBadge({ tier }: { tier: string }) {
  const config = {
    free: { icon: Zap, color: 'text-slate-500 bg-white/5 border-white/10', label: 'Free' },
    mid: { icon: Sparkles, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', label: 'Pro' },
    enterprise: { icon: Crown, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Enterprise' },
  }
  const { icon: Icon, color, label } = config[tier as keyof typeof config] || config.free

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
      <Icon className="h-2.5 w-2.5 mr-1" />
      {label}
    </span>
  )
}

function WorkspaceSelector() {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)

  if (!currentWorkspace) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/[0.08]"
      >
        <Building2 className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-sm font-medium text-slate-300 max-w-[140px] truncate">
          {currentWorkspace.name}
        </span>
        <TierBadge tier={currentWorkspace.tier} />
        <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-72 bg-obsidian-900 rounded-xl shadow-2xl border border-white/[0.08] py-1.5 z-20">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              Workspaces
            </div>
            {workspaces.map(({ workspace, role }) => (
              <button
                key={workspace.id}
                onClick={() => {
                  setCurrentWorkspace(workspace)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-white/[0.04] flex items-center justify-between transition-colors ${
                  currentWorkspace.id === workspace.id ? 'bg-violet-500/10' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm text-slate-300 truncate max-w-[120px]">
                    {workspace.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TierBadge tier={workspace.tier} />
                  <span className="text-[10px] text-slate-600">{role}</span>
                </div>
              </button>
            ))}
            {currentWorkspace.tier !== 'free' && (
              <div className="border-t border-white/[0.06] mt-1.5 pt-1.5 px-3">
                <button className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  + New workspace
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  return (
    <div className="flex items-center space-x-3">
      <WorkspaceSelector />
      <div className="h-4 w-px bg-white/[0.08]" />
      <div className="flex items-center space-x-2">
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name || 'User'}
            className="h-7 w-7 rounded-full ring-1 ring-white/10"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        <div className={`h-7 w-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center ${user?.picture ? 'hidden' : ''}`}>
          <span className="text-xs font-semibold text-violet-400">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-slate-400">{user?.name || user?.email}</span>
      </div>
      <button
        onClick={logout}
        className="text-slate-600 hover:text-slate-300 p-1 rounded transition-colors"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation()
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'text-slate-100 bg-white/[0.07]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </Link>
  )
}

function AppContent() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-obsidian-950">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <>
                  {/* Header */}
                  <header className="bg-obsidian-950 border-b border-white/[0.06] sticky top-0 z-30 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="flex justify-between items-center h-14">
                        <div className="flex items-center gap-6">
                          <Link to="/" className="flex items-center space-x-2.5">
                            <img src="/favicon.svg" alt="Tenet AI" className="h-7 w-7 rounded" />
                            <span className="text-base font-semibold text-slate-100 tracking-tight">Tenet AI</span>
                          </Link>
                          <nav className="flex items-center gap-1">
                            <NavLink to="/">Executions</NavLink>
                            <NavLink to="/analytics">Insights</NavLink>
                            <NavLink to="/api-keys">API Keys</NavLink>
                            <Link
                              to="/demo"
                              className="px-3 py-1.5 text-sm font-medium rounded-lg text-violet-400 border border-violet-500/25 bg-violet-500/[0.07] hover:bg-violet-500/[0.12] hover:text-violet-300 transition-colors"
                            >
                              Demo
                            </Link>
                          </nav>
                        </div>
                        <UserMenu />
                      </div>
                    </div>
                  </header>

                  {/* Main Content */}
                  <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="pointer-events-none absolute inset-0 grid-pattern opacity-30" />
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/executions/:id" element={<ExecutionDetail />} />
                      <Route path="/executions/:id/proof" element={<OverrideProof />} />
                      <Route path="/sessions/:id" element={<SessionTimeline />} />
                      <Route path="/api-keys" element={<APIKeys />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/demo" element={<MockExecution />} />
                    </Routes>
                  </main>
                </>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <AuthProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
      </AuthProvider>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
