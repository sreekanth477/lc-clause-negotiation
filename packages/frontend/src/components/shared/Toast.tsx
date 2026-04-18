import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (options: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
  dismiss: (id: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (options: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const duration = options.duration ?? 4000
      setToasts((prev) => [...prev.slice(-4), { ...options, id, duration }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast])
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message, duration: 6000 }), [toast])
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast])
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast])

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

// ─── Toast item config ────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; title: string; bar: string }> = {
  success: {
    icon:   <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />,
    bg:     'bg-green-50',
    border: 'border-green-200',
    title:  'text-green-800',
    bar:    'bg-green-500',
  },
  error: {
    icon:   <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
    bg:     'bg-red-50',
    border: 'border-red-200',
    title:  'text-red-800',
    bar:    'bg-red-500',
  },
  warning: {
    icon:   <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />,
    bg:     'bg-amber-50',
    border: 'border-amber-200',
    title:  'text-amber-800',
    bar:    'bg-amber-500',
  },
  info: {
    icon:   <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    title:  'text-blue-800',
    bar:    'bg-blue-500',
  },
}

// ─── Toast item ───────────────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: Toast; dismiss: (id: string) => void }> = ({ toast: t, dismiss }) => {
  const cfg = CONFIG[t.type]
  const [progress, setProgress] = useState(100)
  const duration = t.duration ?? 4000

  useEffect(() => {
    if (duration <= 0) return
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100))
    }, 50)
    return () => clearInterval(interval)
  }, [duration])

  return (
    <div
      className={`relative w-80 ${cfg.bg} border ${cfg.border} rounded-xl shadow-toast overflow-hidden animate-slide-in-up`}
      role="alert"
      aria-live="assertive"
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${cfg.title}`}>{t.title}</p>
          {t.message && (
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{t.message}</p>
          )}
        </div>
        <button
          onClick={() => dismiss(t.id)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 -mt-0.5 -mr-1 p-0.5 rounded"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-0.5 bg-gray-200">
          <div
            className={`h-full ${cfg.bar} transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

const ToastContainer: React.FC<{ toasts: Toast[]; dismiss: (id: string) => void }> = ({
  toasts,
  dismiss,
}) => {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  )
}
