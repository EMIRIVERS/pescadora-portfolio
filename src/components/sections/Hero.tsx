'use client'
import { Waves } from '@/components/ui/wave-background'

export function Hero() {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Wave background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Waves
          backgroundColor="#000000"
          strokeColor="rgba(255,255,255,0.18)"
          pointerSize={0.5}
        />
      </div>

      {/* Wordmark */}
      <div style={{
        flex: 1,
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 200,
          fontSize: 'clamp(3.5rem, 14vw, 10rem)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#f2ede6',
          margin: 0,
          lineHeight: 1,
        }}>
          Carajo
        </p>
        <p style={{
          fontFamily: 'var(--font-geist-mono)',
          fontWeight: 400,
          fontSize: 'clamp(0.8rem, 3vw, 2rem)',
          letterSpacing: '0.55em',
          textTransform: 'uppercase',
          color: 'rgba(242,237,230,0.45)',
          margin: '0.4em 0 0',
          lineHeight: 1,
        }}>
          Films
        </p>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute',
        bottom: '2.5rem',
        left: 0,
        right: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: 0.4,
        animation: 'scrollHint 2.2s ease-in-out infinite',
      }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#f2ede6',
        }}>
          Scroll
        </span>
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <path d="M6 0v16M1 11l5 5 5-5" stroke="#f2ede6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <style>{`
        @keyframes scrollHint {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(6px); opacity: 0.7; }
        }
      `}</style>
    </section>
  )
}
