'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface CinemaPreloaderProps {
  onComplete: () => void
  progress: number
}

const SESSION_KEY = 'pescadora_visited'

export default function CinemaPreloader({ onComplete, progress }: CinemaPreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topPanelRef = useRef<HTMLDivElement>(null)
  const bottomPanelRef = useRef<HTMLDivElement>(null)
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([])
  const filmsRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const [isReturnVisit] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) === '1'
  })

  // Update counter text reactively
  useEffect(() => {
    const el = counterRef.current
    if (el) {
      el.textContent = String(Math.round(progress * 100)).padStart(3, '0')
    }
  }, [progress])

  useEffect(() => {
    const container = containerRef.current
    const topPanel = topPanelRef.current
    const bottomPanel = bottomPanelRef.current
    if (!container || !topPanel || !bottomPanel) return

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem(SESSION_KEY, '1')
        onComplete()
      },
    })
    timelineRef.current = tl

    if (isReturnVisit) {
      // Quick 500ms split-open, skip text
      tl.to(topPanel, {
        yPercent: -100,
        duration: 0.5,
        ease: 'power4.in',
      })
      tl.to(
        bottomPanel,
        {
          yPercent: 100,
          duration: 0.5,
          ease: 'power4.in',
        },
        '<'
      )
    } else {
      // Phase 1: "Guillotine" - text reveal (0-1.5s)
      const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[]

      // Flash each letter white with stagger
      tl.set(letters, { opacity: 0 })
      tl.to(letters, {
        opacity: 1,
        duration: 0.15,
        stagger: 0.1,
        ease: 'power2.out',
      })

      // Show FILMS text
      if (filmsRef.current) {
        tl.to(filmsRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        }, '-=0.1')
      }

      // Hold for remaining time up to 1.5s
      tl.to({}, { duration: 0.5 })

      // Phase 2: "Split" (1.5s-2.8s)
      tl.to(topPanel, {
        yPercent: -100,
        duration: 1.3,
        ease: 'power4.in',
        onUpdate() {
          const prog = this.progress()
          const blur = prog < 0.3 ? 0 : (prog - 0.3) * 5.7
          topPanel.style.filter = `blur(${blur}px)`
        },
      })
      tl.to(
        bottomPanel,
        {
          yPercent: 100,
          duration: 1.3,
          ease: 'power4.in',
          onUpdate() {
            const prog = this.progress()
            const blur = prog < 0.3 ? 0 : (prog - 0.3) * 5.7
            bottomPanel.style.filter = `blur(${blur}px)`
          },
        },
        '<'
      )
    }

    return () => {
      tl.kill()
      timelineRef.current = null
    }
  }, [onComplete, isReturnVisit])

  const titleLetters = ['X', 'I', 'C', 'O']

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
      onClick={() => {
        if (timelineRef.current) {
          timelineRef.current.progress(1)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === ' ') {
          if (timelineRef.current) {
            timelineRef.current.progress(1)
          }
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Saltar intro"
    >
      {/* Top panel */}
      <div
        ref={topPanelRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50vh',
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
          willChange: 'transform',
        }}
      >
        {!isReturnVisit && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: 'translateY(50%)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.05em' }}>
              {titleLetters.map((letter, i) => (
                <span
                  key={i}
                  ref={(el) => { lettersRef.current[i] = el }}
                  style={{
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontWeight: 900,
                    fontSize: 'clamp(4rem, 12vw, 10rem)',
                    color: 'white',
                    lineHeight: 1,
                    opacity: 0,
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div
        ref={bottomPanelRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50vh',
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
          willChange: 'transform',
        }}
      >
        {!isReturnVisit && (
          <>
            <div
              ref={filmsRef}
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontWeight: 400,
                fontSize: 'clamp(0.7rem, 1.5vw, 1.1rem)',
                color: 'white',
                letterSpacing: '0.5em',
                textTransform: 'uppercase',
                opacity: 0,
                marginTop: 'clamp(0.5rem, 1vw, 1rem)',
              }}
            >
              FILMS
            </div>

            {/* Numeric counter */}
            <div
              ref={counterRef}
              style={{
                position: 'absolute',
                bottom: '2rem',
                right: '2rem',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontWeight: 300,
                fontSize: 'clamp(0.6rem, 1vw, 0.85rem)',
                color: 'rgba(255, 255, 255, 0.4)',
                letterSpacing: '0.1em',
              }}
            >
              000
            </div>
          </>
        )}
      </div>
    </div>
  )
}
