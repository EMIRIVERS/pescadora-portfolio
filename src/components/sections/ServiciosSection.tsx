'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SERVICIOS = [
  'Fotografia de Marca',
  'Direccion de Arte',
  'Video de Campana',
  'Fotografia de Producto',
  'Fotografia Gastronomica',
  'Fotografia de Locacion',
]

export function ServiciosSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const itemsRef = useRef<HTMLDivElement[]>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    const title = titleRef.current
    const items = itemsRef.current

    if (!section || !title) return

    const triggers: ScrollTrigger[] = []

    // Title animation
    gsap.set(title, { opacity: 0, y: 40 })
    const titleTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(title, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
        })
      },
    })
    triggers.push(titleTrigger)

    // List items stagger animation
    if (items.length > 0) {
      gsap.set(items, { opacity: 0, y: 20 })
      const itemsTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        onEnter: () => {
          gsap.to(items, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.08,
          })
        },
      })
      triggers.push(itemsTrigger)
    }

    return () => {
      triggers.forEach((trigger) => trigger.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="servicios"
      style={{
        padding: '6rem 2rem',
        background: 'var(--color-bg)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2
          ref={titleRef}
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: '#ede8e0',
            margin: '0 0 4rem',
            lineHeight: 0.9,
          }}
        >
          Servicios
        </h2>

        <div>
          {SERVICIOS.map((servicio, i) => (
            <div
              key={servicio}
              ref={(el) => {
                if (el) itemsRef.current[i] = el
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '1.5rem',
                padding: '1.25rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: 'default',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  color: hoveredIndex === i ? '#e8341a' : '#6b6560',
                  transition: 'color 0.2s ease',
                  flexShrink: 0,
                  userSelect: 'none',
                  minWidth: '2ch',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-geist-sans)',
                  fontWeight: 700,
                  fontSize: 'clamp(1rem, 2vw, 1.4rem)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#ede8e0',
                }}
              >
                {servicio}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
