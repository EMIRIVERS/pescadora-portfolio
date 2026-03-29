'use client'
import { ParticleWordmark } from '@/components/ui/ParticleWordmark'
import { EtheralShadow } from '@/components/ui/etheral-shadow'

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
        background: '#04080f',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Ocean background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#04080f',
          }}
        />
        <EtheralShadow
          color="rgba(15, 90, 190, 0.9)"
          animation={{ scale: 60, speed: 20 }}
          noise={{ opacity: 0.4, scale: 1.0 }}
          sizing="fill"
          style={{ position: 'absolute', inset: 0 }}
        />
        <EtheralShadow
          color="rgba(0, 170, 200, 0.55)"
          animation={{ scale: 45, speed: 14 }}
          sizing="fill"
          style={{ position: 'absolute', inset: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #020b14 0%, transparent 45%)',
          }}
        />
      </div>

      {/* Fish particle canvas */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <ParticleWordmark
          color="#f2ede6"
          background="transparent"
          triggerExit={triggerExit}
          onExitComplete={onExitComplete}
        />
      </div>

      {/* Button */}
      {!triggerExit && (
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
