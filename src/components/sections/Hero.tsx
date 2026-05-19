'use client'

import { GradientBackground } from '@/components/ui/paper-design-shader-background'

export function Hero() {
  return (
    <section
      id="hero"
      style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <GradientBackground />

      {/* Overlay oscuro */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        zIndex: 10,
      }} />

      {/* Logo XICO FILMS — the page's single semantic <h1>.
          Visible text stays "XICO / FILMS"; a visually-hidden suffix gives
          crawlers and screen readers the full descriptive heading. */}
      <h1 style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        margin: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 900,
          fontSize: 'clamp(5rem, 22vw, 18rem)',
          letterSpacing: '-0.03em',
          lineHeight: 0.85,
          textTransform: 'uppercase',
          color: 'var(--color-text)',
          display: 'block',
        }}>
          XICO
        </span>

        <span aria-hidden="true" style={{
          display: 'block',
          width: '100%',
          maxWidth: 'clamp(300px, 60vw, 900px)',
          height: '1px',
          background: 'rgba(255,255,255,0.12)',
          margin: '1.2rem 0',
        }} />

        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontWeight: 400,
          fontSize: 'clamp(0.7rem, 2vw, 1.3rem)',
          letterSpacing: '0.6em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          lineHeight: 1,
          display: 'block',
        }}>
          FILMS
        </span>

        <span style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          border: 0,
        }}>
          {' '}— Productora de video y fotografía de campaña en México
        </span>
      </h1>

      {/* Fade inferior */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
        background: 'linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%)',
        pointerEvents: 'none',
        zIndex: 21,
      }} />

      {/* Scroll hint */}
      <div style={{
        position: 'absolute',
        bottom: '2.5rem',
        left: 0,
        right: 0,
        zIndex: 22,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
        animation: 'heroScrollHint 2.2s ease-in-out infinite',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 'clamp(0.6rem, 1.8vw, 0.75rem)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
        }}>
          Scroll para explorar
        </span>
        <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
          <path d="M7 0v18M1 12l6 6 6-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
        </svg>
      </div>

      <style>{`
        @keyframes heroScrollHint {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(6px); opacity: 0.55; }
        }
      `}</style>
    </section>
  )
}
