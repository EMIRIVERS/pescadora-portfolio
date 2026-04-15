'use client'
import { Waves } from '@/components/ui/wave-background'

interface HeroProps {
  onVerTrabajo: () => void
}

export function Hero({ onVerTrabajo }: HeroProps) {
  return (
    <section
      id="hero"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        zIndex: 50,
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

      {/* Button */}
      {true && (
        <div
          style={{
            position: 'absolute',
            bottom: '3.5rem',
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={onVerTrabajo}
            data-cursor="link"
            style={{
              background: 'transparent',
              border: '1px solid rgba(242,237,230,0.25)',
              color: 'rgba(242,237,230,0.7)',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              padding: '0.9rem 2.5rem',
              cursor: 'pointer',
              transition: 'border-color 0.3s, color 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(242,237,230,0.7)'
              e.currentTarget.style.color = '#f2ede6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(242,237,230,0.25)'
              e.currentTarget.style.color = 'rgba(242,237,230,0.7)'
            }}
          >
            Ver Trabajo
          </button>
        </div>
      )}
    </section>
  )
}
