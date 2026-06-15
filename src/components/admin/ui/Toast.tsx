'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useReducer,
  useRef,
  useEffect,
} from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TOASTS = 5

const COLORS: Record<ToastType, string> = {
  success: 'var(--dash-success)',
  error:   'var(--dash-danger)',
  info:    'var(--dash-accent)',
  warning: 'var(--dash-warning)',
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  info:    3500,
  warning: 5000,
  error:   5000,
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
  warning: AlertTriangle,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD': {
      const toasts = [action.toast, ...state.toasts].slice(0, MAX_TOASTS)
      return { toasts }
    }
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  dispatch: React.Dispatch<ToastAction>
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Individual Toast item ────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [exiting, setExiting] = React.useState(false)
  const color = COLORS[toast.type]
  const Icon = ICONS[toast.type]
  const duration = toast.duration ?? DEFAULT_DURATION[toast.type]

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(toast.id), 320)
  }, [toast.id, onRemove])

  useEffect(() => {
    const timer = setTimeout(dismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, dismiss])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'var(--dash-surface-2)',
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '12px',
        padding: '13px 14px',
        minWidth: '280px',
        maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        animation: exiting
          ? 'toast-out 0.32s cubic-bezier(0.4,0,1,1) forwards'
          : 'toast-in 0.32s cubic-bezier(0,0,0.2,1) forwards',
        willChange: 'transform, opacity',
      }}
    >
      <Icon
        size={18}
        style={{ color, flexShrink: 0, marginTop: '1px' }}
        strokeWidth={2.2}
      />
      <span
        style={{
          flex: 1,
          fontSize: '14px',
          lineHeight: '1.45',
          color: 'var(--dash-text-primary)',
          fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        {toast.message}
      </span>
      <button
        onClick={dismiss}
        aria-label="Cerrar notificación"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          color: 'var(--dash-text-secondary)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-primary)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-secondary)')
        }
      >
        <X size={14} strokeWidth={2.2} />
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { toasts: [] })

  const handleRemove = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ dispatch }}>
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toast-out {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
      `}</style>

      {children}

      {/* Toast container */}
      <div
        role="region"
        aria-label="Notificaciones"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {state.toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} onRemove={handleRemove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

let _uid = 0
function uid() {
  _uid += 1
  return String(_uid)
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  const { dispatch } = ctx

  const add = useCallback(
    (message: string, type: ToastType, duration?: number) => {
      const id = uid()
      dispatch({ type: 'ADD', toast: { id, message, type, duration } })
    },
    [dispatch],
  )

  return {
    success: (msg: string, duration?: number) => add(msg, 'success', duration),
    error:   (msg: string, duration?: number) => add(msg, 'error',   duration),
    info:    (msg: string, duration?: number) => add(msg, 'info',    duration),
    warning: (msg: string, duration?: number) => add(msg, 'warning', duration),
  }
}
