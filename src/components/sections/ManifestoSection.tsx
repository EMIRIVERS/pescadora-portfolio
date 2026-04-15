'use client'

import { useEffect, useRef, useCallback, CSSProperties } from 'react'

const STAGGER_DELAYS = [0, 160, 320]

const hiddenStyle: CSSProperties = {
  opacity: 0,
  transform: 'translateY(30px)',
  transition: 'opacity 0.8s ease, transform 0.8s ease',
}

export default function ManifestoSection() {
  const blockRefs = useRef<(HTMLElement | null)[]>([])

  const setBlockRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      blockRefs.current[index] = el
    },
    [],
  )

  useEffect(() => {
    const elements = blockRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    )
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const index = elements.indexOf(el)
          const delay = index >= 0 ? (STAGGER_DELAYS[index] ?? 0) : 0
          setTimeout(() => {
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, delay)
          observer.unobserve(el)
        })
      },
      { threshold: 0.15 },
    )

    elements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section
      style={{
        padding: '6rem 2rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'transparent',
      }}
    >
      <div style={{ maxWidth: 800, width: '100%' }}>
        {/* Label row */}
        <div
          ref={setBlockRef(0)}
          style={{
            ...hiddenStyle,
            display: 'flex',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <span
            style={{
              color: '#e8341a',
              marginRight: '0.5rem',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.55rem',
              letterSpacing: '0.05em',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            ──
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.55rem',
              letterSpacing: '0.3em',
              color: '#6b6560',
              textTransform: 'uppercase',
            }}
          >
            MANIFIESTO
          </span>
        </div>

        {/* Primary statement */}
        <p
          ref={setBlockRef(1)}
          style={{
            ...hiddenStyle,
            fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
            fontWeight: 300,
            lineHeight: 1.4,
            color: '#ede8e0',
            letterSpacing: '0.01em',
            fontFamily: 'var(--font-geist-sans)',
            margin: 0,
          }}
        >
          Hacemos{' '}
          <span style={{ fontWeight: 800, color: '#ede8e0' }}>
            imagenes que no se olvidan.
          </span>{' '}
          Creemos que la imagen es un{' '}
          <span style={{ fontWeight: 800, color: '#ede8e0' }}>argumento.</span>{' '}
          No decoramos — construimos{' '}
          <span style={{ fontWeight: 800, color: '#ede8e0' }}>
            lenguaje visual
          </span>{' '}
          que conecta marcas con personas. Cada proyecto es una pieza de
          comunicacion pensada para{' '}
          <span style={{ fontWeight: 800, color: '#ede8e0' }}>quedarse.</span>
        </p>

        {/* Location tag */}
        <p
          ref={setBlockRef(2)}
          style={{
            ...hiddenStyle,
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#8a8078',
            marginTop: '3rem',
            marginBottom: 0,
          }}
        >
          Mexico — Activos donde el trabajo lo exige
        </p>
      </div>
    </section>
  )
}
