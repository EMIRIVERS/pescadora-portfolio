'use client'

import { useEffect, useRef } from 'react'
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

    // Grid items stagger animation
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
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2
          ref={titleRef}
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-8)',
          }}
        >
          Servicios
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0,
          }}
        >
          {SERVICIOS.map((servicio, i) => (
            <div
              key={servicio}
              ref={(el) => {
                if (el) itemsRef.current[i] = el
              }}
              style={{
                padding: 'var(--space-3) 0',
                borderTop: '1px solid var(--color-border)',
                borderRight: i % 2 === 0 ? '1px solid var(--color-border)' : 'none',
                paddingRight: i % 2 === 0 ? 'var(--space-4)' : 0,
                paddingLeft: i % 2 === 1 ? 'var(--space-4)' : 0,
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 300,
                fontSize: 'clamp(1rem, 1.5vw, 1.2rem)',
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {servicio}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
