'use client'

import { useEffect } from 'react'

export default function PortalError({
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
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--portal-text-muted)',
        marginBottom: '1rem',
      }}>
        Error
      </p>
      <h2 style={{
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--portal-text)',
        margin: '0 0 0.75rem',
      }}>
        Algo salió mal
      </h2>
      <p style={{
        fontSize: 14,
        color: 'var(--portal-text-muted)',
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
          background: '#0071e3',
          border: 'none',
          borderRadius: 10,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
