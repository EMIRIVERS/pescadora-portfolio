'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ServicioCategory {
  label: string
  items: string[]
}

const SERVICIOS: ServicioCategory[] = [
  {
    label: 'Producción Audiovisual',
    items: [
      'Comerciales',
      'Video Clips',
      'Reels y Contenido Vertical',
      'Corporativos y Testimoniales',
      'Bodas y Ceremonias',
      'Eventos Sociales',
      'Podcast',
    ],
  },
  {
    label: 'Fotografía',
    items: [
      'Estudio',
      'Producto',
      'Books y Sesiones Personales',
      'Bodas y Ceremonias',
      'Eventos',
    ],
  },
  {
    label: 'Dirección Creativa',
    items: [
      'Imagen de Marca',
      'Imagen Personal',
      'Naming y Conceptualización',
      'Guión y Storyboard',
      'Coordinación de Proyectos',
    ],
  },
  {
    label: 'Gestión de Redes Sociales',
    items: [
      'Estrategia de Contenido',
      'Parrilla Editorial',
      'Producción de Contenido',
      'Cobertura Mensual',
    ],
  },
  {
    label: 'Sectores',
    items: [
      'Bienes Raíces — foto, video y drone',
      'Restaurantes y Gastronomía — foto, video y menú',
      'Eventos Corporativos — cobertura completa + drone',
    ],
  },
]

export function ServiciosSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const itemsRef = useRef<HTMLDivElement[]>([])
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    const title = titleRef.current
    const items = itemsRef.current

    if (!section || !title) return

    const triggers: ScrollTrigger[] = []

    gsap.set(title, { opacity: 0, y: 40 })
    const titleTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(title, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
      },
    })
    triggers.push(titleTrigger)

    if (items.length > 0) {
      gsap.set(items, { opacity: 0, y: 20 })
      const itemsTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        onEnter: () => {
          gsap.to(items, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 })
        },
      })
      triggers.push(itemsTrigger)
    }

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [])

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i))
  }

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
          {SERVICIOS.map((cat, i) => {
            const isOpen = openIndex === i
            const isHovered = hoveredIndex === i

            return (
              <div
                key={cat.label}
                ref={(el) => { if (el) itemsRef.current[i] = el }}
              >
                {/* Category header — clickable */}
                <button
                  onClick={() => toggle(i)}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '1.25rem 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {/* Number */}
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono, monospace)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      color: isHovered || isOpen ? '#e8341a' : '#6b6560',
                      transition: 'color 0.2s ease',
                      flexShrink: 0,
                      userSelect: 'none',
                      minWidth: '2ch',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Label */}
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-geist-sans)',
                      fontWeight: 700,
                      fontSize: 'clamp(1rem, 2vw, 1.4rem)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: isHovered || isOpen ? '#ede8e0' : '#ede8e0',
                    }}
                  >
                    {cat.label}
                  </span>

                  {/* Expand indicator */}
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono, monospace)',
                      fontSize: '1.1rem',
                      fontWeight: 300,
                      color: isOpen ? '#e8341a' : '#6b6560',
                      transition: 'color 0.2s ease, transform 0.3s ease',
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                      lineHeight: 1,
                      flexShrink: 0,
                      userSelect: 'none',
                    }}
                  >
                    +
                  </span>
                </button>

                {/* Sub-items — animated expand */}
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: isOpen ? `${cat.items.length * 56}px` : '0px',
                    transition: 'max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderBottom: isOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <div style={{ padding: '0.5rem 0 1rem 3.5rem' }}>
                    {cat.items.map((item, j) => (
                      <div
                        key={item}
                        style={{
                          padding: '0.6rem 0',
                          borderBottom: j < cat.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: '#e8341a',
                            flexShrink: 0,
                            opacity: 0.7,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--font-geist-sans)',
                            fontSize: 'clamp(0.8rem, 1.4vw, 1rem)',
                            fontWeight: 400,
                            letterSpacing: '0.04em',
                            color: '#9b9590',
                          }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
