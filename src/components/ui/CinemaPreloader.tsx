'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface CinemaPreloaderProps {
  onComplete: () => void
  progress: number
}

const SESSION_KEY = 'xico_visited'
const LETTERS = ['X', 'I', 'C', 'O']

export default function CinemaPreloader({ onComplete, progress }: CinemaPreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLDivElement>(null)
  const filmsRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const [isReturnVisit] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) === '1'
  })

  useEffect(() => {
    const el = counterRef.current
    if (el) {
      el.textContent = String(Math.round(progress * 100)).padStart(3, '0')
    }
  }, [progress])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem(SESSION_KEY, '1')
        onComplete()
      },
    })
    timelineRef.current = tl

    if (isReturnVisit) {
      tl.to(container, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      })
    } else {
      // Let the cube animation play, then fade out
      tl.to({}, { duration: 2.8 })
      tl.to(container, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.in',
      })
    }

    return () => {
      tl.kill()
      timelineRef.current = null
    }
  }, [onComplete, isReturnVisit])

  return (
    <div
      ref={containerRef}
      onClick={() => { timelineRef.current?.progress(1) }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === ' ') timelineRef.current?.progress(1)
      }}
      tabIndex={0}
      role="button"
      aria-label="Saltar intro"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        pointerEvents: 'auto',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}
    >
      <style>{`
        .xico-loader-grid {
          display: flex;
          gap: clamp(6px, 1.5vw, 14px);
          perspective: 600px;
        }

        .xico-cube {
          width: clamp(40px, 10vw, 72px);
          height: clamp(40px, 10vw, 72px);
          position: relative;
          transform-style: preserve-3d;
          animation: xico-translate-z 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        .xico-cube:nth-child(1) { animation-delay: 0s; }
        .xico-cube:nth-child(2) { animation-delay: 0.1s; }
        .xico-cube:nth-child(3) { animation-delay: 0.2s; }
        .xico-cube:nth-child(4) { animation-delay: 0.3s; }

        .xico-face {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
          font-weight: 900;
          font-size: clamp(1.4rem, 4vw, 2.8rem);
          letter-spacing: -0.02em;
          color: transparent;
          background-color: transparent;
          border: 1px solid rgba(232, 52, 26, 0.15);
          animation:
            xico-face-color 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite,
            xico-edge-glow 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        .xico-face-front {
          transform: translateZ(calc(clamp(40px, 10vw, 72px) / 2));
          animation:
            xico-face-color 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite,
            xico-face-glow 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite,
            xico-edge-glow 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        .xico-face-back {
          transform: rotateY(180deg) translateZ(calc(clamp(40px, 10vw, 72px) / 2));
        }

        .xico-face-right {
          transform: rotateY(90deg) translateZ(calc(clamp(40px, 10vw, 72px) / 2));
        }

        .xico-face-left {
          transform: rotateY(-90deg) translateZ(calc(clamp(40px, 10vw, 72px) / 2));
        }

        .xico-face-top {
          transform: rotateX(90deg) translateZ(calc(clamp(40px, 10vw, 72px) / 2));
        }

        .xico-face-bottom {
          transform: rotateX(-90deg) translateZ(calc(clamp(40px, 10vw, 72px) / 2));
        }

        .xico-cube:nth-child(1) .xico-face { animation-delay: 0s; }
        .xico-cube:nth-child(2) .xico-face { animation-delay: 0.1s; }
        .xico-cube:nth-child(3) .xico-face { animation-delay: 0.2s; }
        .xico-cube:nth-child(4) .xico-face { animation-delay: 0.3s; }

        .xico-cube:nth-child(1) .xico-face-front { animation-delay: 0s; }
        .xico-cube:nth-child(2) .xico-face-front { animation-delay: 0.1s; }
        .xico-cube:nth-child(3) .xico-face-front { animation-delay: 0.2s; }
        .xico-cube:nth-child(4) .xico-face-front { animation-delay: 0.3s; }

        @keyframes xico-translate-z {
          0%, 40%, 100% {
            transform: translateZ(-2px);
          }
          30% {
            transform: translateZ(16px) translateY(-1px);
          }
        }

        @keyframes xico-face-color {
          0%, 50%, 100% {
            background-color: transparent;
          }
          10% {
            background-color: #e8341a;
          }
        }

        @keyframes xico-face-glow {
          0%, 50%, 100% {
            color: transparent;
            filter: none;
          }
          30% {
            color: #fff;
            filter: drop-shadow(0 14px 10px #e8341a);
          }
        }

        @keyframes xico-edge-glow {
          0%, 40%, 100% {
            box-shadow: inset 0 0 2px 1px rgba(0,0,0,0.07),
              inset 0 0 12px 1px rgba(255,255,255,0.07);
          }
          30% {
            box-shadow: 0 0 2px 0px #e8341a;
          }
        }
      `}</style>

      {!isReturnVisit && (
        <>
          {/* 3D Cube loader */}
          <div className="xico-loader-grid">
            {LETTERS.map((letter, i) => (
              <div key={i} className="xico-cube">
                <div className="xico-face xico-face-front">{letter}</div>
                <div className="xico-face xico-face-back" />
                <div className="xico-face xico-face-right" />
                <div className="xico-face xico-face-left" />
                <div className="xico-face xico-face-top" />
                <div className="xico-face xico-face-bottom" />
              </div>
            ))}
          </div>

          {/* FILMS subtitle */}
          <div
            ref={filmsRef}
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontWeight: 400,
              fontSize: 'clamp(0.6rem, 1.2vw, 0.9rem)',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.6em',
              textTransform: 'uppercase',
            }}
          >
            FILMS
          </div>

          {/* Progress counter */}
          <div
            ref={counterRef}
            style={{
              position: 'absolute',
              bottom: 'clamp(1rem, 3vh, 2rem)',
              right: 'clamp(1rem, 3vw, 2rem)',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontWeight: 300,
              fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
              color: 'rgba(232, 52, 26, 0.5)',
              letterSpacing: '0.1em',
            }}
          >
            000
          </div>

          {/* Skip hint */}
          <div
            style={{
              position: 'absolute',
              bottom: 'clamp(1rem, 3vh, 2rem)',
              left: 'clamp(1rem, 3vw, 2rem)',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 'clamp(0.55rem, 1.5vw, 0.6rem)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              padding: '0.5rem',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Toca para saltar
          </div>
        </>
      )}
    </div>
  )
}
