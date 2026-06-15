'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Design tokens (mirrored from page.tsx so this file is self-contained) ──

const T = {
  surface1:      'var(--dash-surface-1)',
  border:        'var(--dash-border)',
  borderFocus:   'rgba(var(--dash-accent-rgb),0.60)',
  textPrimary:   'var(--dash-text-primary)',
  textTertiary:  'var(--dash-text-tertiary)',
  accent:        'var(--dash-accent)',
  font:          "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const

// ── Helpers ────────────────────────────────────────────────────────────────

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform)
}

// ── Component ──────────────────────────────────────────────────────────────

interface SearchInputProps {
  /** The current value of the `q` search param (from the server). */
  defaultValue: string
}

export default function SearchInput({ defaultValue }: SearchInputProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus the input on mount.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Global Cmd+K / Ctrl+K shortcut — focuses the input from anywhere.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  // Debounced navigation — updates `?q=` without adding to the history stack.
  const handleChange = useCallback(
    (value: string) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams()
        if (value.trim().length > 0) params.set('q', value.trim())
        router.replace(`/admin/buscar${params.size > 0 ? `?${params}` : ''}`)
      }, 300)
    },
    [router],
  )

  // Clean up the pending timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const modKey = isMac() ? '\u2318K' : 'Ctrl+K'

  return (
    <>
      <style>{`
        .buscar-input {
          flex: 1;
          background: ${T.surface1};
          border: 1px solid ${T.border};
          border-radius: 14px;
          padding: 16px 20px;
          padding-right: 92px;
          font-size: 17px;
          color: ${T.textPrimary};
          font-family: ${T.font};
          outline: none;
          caret-color: ${T.accent};
          min-width: 0;
          transition: border-color 0.15s, box-shadow 0.15s;
          letter-spacing: -0.01em;
        }
        .buscar-input::placeholder {
          color: ${T.textTertiary};
        }
        .buscar-input:focus {
          border-color: ${T.borderFocus};
          box-shadow: 0 0 0 3px rgba(var(--dash-accent-rgb), 0.15);
        }
        .buscar-shortcut-badge {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--dash-border);
          border: 1px solid var(--dash-border);
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 500;
          color: ${T.textTertiary};
          font-family: ${T.font};
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          letter-spacing: 0;
        }
      `}</style>

      <div style={{ position: 'relative', display: 'flex' }}>
        {/* Left search icon */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            color: T.textTertiary,
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>

        <input
          ref={inputRef}
          className="buscar-input"
          type="search"
          defaultValue={defaultValue}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Buscar proyectos, clientes, leads..."
          aria-label="Buscar en el dashboard"
          onChange={(e) => handleChange(e.target.value)}
          style={{ paddingLeft: '48px' }}
        />

        {/* Keyboard shortcut badge */}
        <span className="buscar-shortcut-badge" aria-label={`Atajo de teclado: ${modKey}`}>
          {modKey}
        </span>
      </div>
    </>
  )
}
