'use client'

import { useEffect, useRef, useCallback, CSSProperties } from 'react'

const BLOCKS: { text: string; style: CSSProperties }[] = [
  {
    text: 'Hacemos imagenes que no se olvidan.',
    style: {
      fontSize: 'clamp(1.6rem, 3vw, 2.8rem)',
      fontWeight: 300,
      color: '#f2ede6',
      fontFamily: 'var(--font-geist-sans)',
    },
  },
  {
    text: 'Creemos que la imagen es un argumento. No decoramos — construimos lenguaje visual que conecta marcas con personas. Cada proyecto es una pieza de comunicacion pensada para quedarse.',
    style: {
      fontSize: 'clamp(1rem, 1.8vw, 1.4rem)',
      color: '#8a8078',
      lineHeight: 1.7,
      marginTop: '2rem',
    },
  },
  {
    text: 'Mexico — Activos donde el trabajo lo exige',
    style: {
      fontFamily: 'var(--font-geist-mono)',
      fontSize: '0.75rem',
      letterSpacing: '0.2em',
      textTransform: 'uppercase' as const,
      color: '#8a8078',
      marginTop: '3rem',
    },
  },
]

const STAGGER_DELAYS = [0, 200, 400]

const hiddenStyle: CSSProperties = {
  opacity: 0,
  transform: 'translateY(30px)',
  transition: 'opacity 0.8s ease, transform 0.8s ease',
}

const visibleStyle: CSSProperties = {
  opacity: 1,
  transform: 'translateY(0)',
  transition: 'opacity 0.8s ease, transform 0.8s ease',
}

export default function ManifestoSection() {
  const blockRefs = useRef<(HTMLParagraphElement | null)[]>([])

  const setBlockRef = useCallback(
    (index: number) => (el: HTMLParagraphElement | null) => {
      blockRefs.current[index] = el
    },
    [],
  )

  useEffect(() => {
    const elements = blockRefs.current.filter(
      (el): el is HTMLParagraphElement => el !== null,
    )
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const index = elements.indexOf(el as HTMLParagraphElement)
          const delay = index >= 0 ? STAGGER_DELAYS[index] : 0
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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: '4rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: 760, width: '100%' }}>
        {BLOCKS.map((block, i) => (
          <p
            key={i}
            ref={setBlockRef(i)}
            style={{ ...block.style, ...hiddenStyle }}
          >
            {block.text}
          </p>
        ))}
      </div>
    </section>
  )
}
