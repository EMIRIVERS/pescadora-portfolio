'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--dash-text-tertiary)',
        marginBottom: '1rem',
      }}>
        Error
      </p>
      <h2 style={{
        fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: 'var(--dash-text-primary)',
        margin: '0 0 0.75rem',
      }}>
        Algo salió mal
      </h2>
      <p style={{
        fontSize: 14,
        color: 'var(--dash-text-secondary)',
        lineHeight: 1.6,
        maxWidth: 400,
        margin: '0 0 2rem',
      }}>
        Ocurrió un error al cargar esta sección. Por favor intenta de nuevo.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          background: 'var(--dash-accent)',
          backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--dash-accent) 80%, white) 0%, var(--dash-accent) 100%)',
          border: 'none',
          borderRadius: 10,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
