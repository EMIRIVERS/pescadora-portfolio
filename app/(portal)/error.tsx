'use client'

import { useEffect } from 'react'

// ── Cinematic brand tokens ──────────────────────────────────────────────────
const CREAM = 'var(--portal-text)'
const MUTED = 'var(--portal-text-muted)'
const FAINT = 'var(--portal-text-dim)'
const ACCENT = 'var(--portal-accent)'
const BORDER = 'var(--portal-border)'
const SERIF = 'var(--portal-serif)'
const MONO = 'var(--portal-mono)'
const SANS = 'var(--portal-sans)'

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        background: 'var(--portal-bg)',
        padding: 'clamp(2.5rem, 6vw, 4rem) 1.5rem',
        textAlign: 'center',
      }}
    >
      <style>{`
        .portal-error-retry {
          transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease;
        }
        .portal-error-retry:hover:not(:disabled) {
          border-color: ${ACCENT};
          color: #fff;
          background: rgba(232,52,26,0.10);
        }
      `}</style>

      {/* Eyebrow */}
      <p
        style={{
          fontFamily: MONO,
          fontSize: '0.62rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: FAINT,
          margin: '0 0 1.3rem',
        }}
      >
        <span style={{ color: ACCENT, marginRight: '0.6rem' }}>&mdash;&mdash;</span>
        Error
      </p>

      {/* Title — serif italic */}
      <h2
        style={{
          fontFamily: SERIF,
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: 'clamp(2rem, 6vw, 3.4rem)',
          lineHeight: 1.04,
          letterSpacing: '-0.01em',
          color: CREAM,
          margin: 0,
        }}
      >
        Algo salió mal.
      </h2>

      {/* Message */}
      <p
        style={{
          fontFamily: SANS,
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: MUTED,
          maxWidth: '32rem',
          margin: '1.4rem 0 0',
        }}
      >
        Ocurrió un error al cargar esta sección del portal. Vuelve a intentarlo;
        si el problema persiste, escríbenos a{' '}
        <a
          href="mailto:hola@xicofilms.com"
          className="portal-textlink"
          style={{ color: CREAM }}
        >
          hola@xicofilms.com
        </a>
        .
      </p>

      {/* Optional digest for debugging */}
      {error.digest && (
        <p
          style={{
            fontFamily: MONO,
            fontSize: '0.58rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: FAINT,
            margin: '1.1rem 0 0',
          }}
        >
          Ref. {error.digest}
        </p>
      )}

      {/* Retry button — mono outline */}
      <button
        type="button"
        onClick={reset}
        className="portal-error-retry"
        style={{
          marginTop: '2.4rem',
          padding: '0.85rem 2rem',
          minHeight: 44,
          borderRadius: '4px',
          border: `1px solid ${BORDER}`,
          background: 'transparent',
          color: CREAM,
          fontFamily: MONO,
          fontSize: '0.65rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
