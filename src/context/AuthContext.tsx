import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  picture: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null        // kept for API compatibility (workspace context etc.)
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: verify existing session cookie via edge function
  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.authenticated && data?.username) {
          setUser({
            id: data.username,
            email: data.username,
            name: data.username,
            picture: null,
          })
        }
      })
      .catch(() => { /* network error — stay logged out */ })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Login failed')
    }

    const data = await res.json()
    setUser({
      id: data.username,
      email: data.username,
      name: data.username,
      picture: null,
    })
  }

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token: user ? 'session' : null,   // downstream code checks truthiness only
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
