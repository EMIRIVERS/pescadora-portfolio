'use client'
import { ParticleWordmark } from '@/components/ui/ParticleWordmark'

interface HeroProps {
  triggerExit: boolean
  onExitComplete: () => void
  onVerTrabajo: () => void
}

export function Hero({ triggerExit, onExitComplete, onVerTrabajo }: HeroProps) {
  return (
    <section
      id="hero"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#080808',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Fish particle canvas — fills viewport */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ParticleWordmark
          color="#f2ede6"
          background="#080808"
          triggerExit={triggerExit}
          onExitComplete={onExitComplete}
        />
      </div>

      {/* Button — only visible in idle state */}
      {!triggerExit && (
        <div
          style={{
            position: 'absolute',
            bottom: '3.5rem',
            left: 0,
            right: 0,
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
              cursor: 'none',
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
