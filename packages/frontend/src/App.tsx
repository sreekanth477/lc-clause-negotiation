import React, { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { ToastProvider } from './components/shared/Toast'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { NewLCReview } from './pages/NewLCReview'
import { ClauseReview } from './pages/ClauseReview'
import { ScrutinyReport } from './pages/ScrutinyReport'
import { ComplianceDashboard } from './pages/ComplianceDashboard'
import { UserRole } from '@lc-copilot/shared'
import { api } from './api/client'
import type { User } from './api/client'

// ─── Private Route guard ──────────────────────────────────────────────────────

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('lc_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Role guard ───────────────────────────────────────────────────────────────

const RoleGuard: React.FC<{
  children: React.ReactNode
  allowedRoles: UserRole[]
}> = ({ children, allowedRoles }) => {
  try {
    const raw = localStorage.getItem('lc_user')
    const user: User | null = raw ? JSON.parse(raw) : null
    if (user && allowedRoles.includes(user.role)) {
      return <>{children}</>
    }
  } catch {
    // fall through
  }
  return <Navigate to="/dashboard" replace />
}

// ─── Login page ───────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already logged in redirect away
  const existingToken = localStorage.getItem('lc_token')
  if (existingToken) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await api.auth.login(email.trim(), password)
      localStorage.setItem('lc_token', token)
      localStorage.setItem('lc_user', JSON.stringify(user))
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1e3a5f] rounded-2xl mb-4">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">LC Copilot</h1>
          <p className="text-sm text-gray-500 mt-1">LC Clause Negotiation AI</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@bank.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d6a9f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo hint */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Demo credentials</p>
          <p>trade.rm@bank.com / <span className="font-mono">password123</span></p>
          <p>compliance@bank.com / <span className="font-mono">password123</span></p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          LC Clause Negotiation Copilot &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected */}
        <Route
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lc/new" element={<NewLCReview />} />
          <Route path="/lc/:id/review" element={<ClauseReview />} />
          <Route path="/lc/:id/report" element={<ScrutinyReport />} />
          <Route
            path="/compliance"
            element={
              <RoleGuard
                allowedRoles={[UserRole.COMPLIANCE_OFFICER, UserRole.ADMIN]}
              >
                <ComplianceDashboard />
              </RoleGuard>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App

