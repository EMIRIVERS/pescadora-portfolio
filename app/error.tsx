'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html>
      <body style={{ margin: 0, background: '#050505', color: '#ede8e0', fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b6560', marginBottom: '1.5rem' }}>Error</p>
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 1rem' }}>Algo salió mal</h1>
          <p style={{ fontSize: '0.9rem', color: '#6b6560', lineHeight: 1.6, margin: '0 0 2rem' }}>
            Ocurrió un error inesperado. Por favor intenta de nuevo.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              background: '#e8341a',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
