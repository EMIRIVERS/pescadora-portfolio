'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ServicioCategory {
  label: string
  items: string[]
}

const SERVICIOS: ServicioCategory[] = [
  {
    label: 'Producci\u00f3n Audiovisual',
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
    label: 'Fotograf\u00eda',
    items: [
      'Estudio',
      'Producto',
      'Books y Sesiones Personales',
      'Bodas y Ceremonias',
      'Eventos',
    ],
  },
  {
    label: 'Direcci\u00f3n Creativa',
    items: [
      'Imagen de Marca',
      'Imagen Personal',
      'Naming y Conceptualizaci\u00f3n',
      'Gui\u00f3n y Storyboard',
      'Coordinaci\u00f3n de Proyectos',
    ],
  },
  {
    label: 'Gesti\u00f3n de Redes Sociales',
    items: [
      'Estrategia de Contenido',
      'Parrilla Editorial',
      'Producci\u00f3n de Contenido',
      'Cobertura Mensual',
    ],
  },
  {
    label: 'Sectores',
    items: [
      'Bienes Ra\u00edces \u2014 foto, video y drone',
      'Restaurantes y Gastronom\u00eda \u2014 foto, video y men\u00fa',
      'Eventos Corporativos \u2014 cobertura completa + drone',
    ],
  },
]

const HEADING_TEXT = 'Servicios'

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function ServiciosSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const charRefs = useRef<HTMLSpanElement[]>([])
  const itemsRef = useRef<HTMLDivElement[]>([])
  const numberRefs = useRef<HTMLSpanElement[]>([])
  const dividerRefs = useRef<HTMLDivElement[]>([])
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const charRandomValues = useMemo(() => {
    return HEADING_TEXT.split('').map((_, i) => ({
      y: (seededRandom(i * 3 + 1) * 80) - 40,
      x: (seededRandom(i * 3 + 2) * 40) - 20,
      rotation: (seededRandom(i * 3 + 3) * 16) - 8,
    }))
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const title = titleRef.current
    const chars = charRefs.current
    const items = itemsRef.current
    const numbers = numberRefs.current
    const dividers = dividerRefs.current

    if (!section || !title) return

    const ctx = gsap.context(() => {
      // ----- Animation 1: Character scatter-to-assemble on heading -----
      if (chars.length > 0) {
        chars.forEach((char, i) => {
          if (!char) return
          gsap.set(char, {
            y: charRandomValues[i].y,
            x: charRandomValues[i].x,
            rotation: charRandomValues[i].rotation,
            opacity: 0,
          })
        })

        gsap.to(chars.filter(Boolean), {
          y: 0,
          x: 0,
          rotation: 0,
          opacity: 1,
          stagger: 0.04,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'top 40%',
            scrub: 1,
          },
        })
      }

      // ----- Animation 2: Counter tick on category numbers -----
      // ----- Animation 3: Line-draw wipe on category dividers -----
      if (items.length > 0) {
        gsap.set(items, { opacity: 0, y: 20 })

        ScrollTrigger.create({
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

            // Counter tick animation for each number
            numbers.forEach((numEl, i) => {
              if (!numEl) return
              const targetValue = i + 1
              const proxy = { val: 0 }
              gsap.to(proxy, {
                val: targetValue,
                duration: 0.4,
                ease: 'power2.out',
                delay: i * 0.08,
                onUpdate: () => {
                  numEl.textContent = String(Math.round(proxy.val)).padStart(2, '0')
                },
              })
            })

            // Line-draw wipe on dividers
            dividers.forEach((div, i) => {
              if (!div) return
              gsap.fromTo(
                div,
                { scaleX: 0 },
                {
                  scaleX: 1,
                  duration: 0.8,
                  ease: 'power2.inOut',
                  delay: i * 0.08,
                },
              )
            })
          },
        })
      }
    }, section)

    return () => {
      ctx.revert()
    }
  }, [charRandomValues])

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
          {HEADING_TEXT.split('').map((char, i) => (
            <span
              key={`${char}-${i}`}
              ref={(el) => {
                if (el) charRefs.current[i] = el
              }}
              style={{ display: 'inline-block' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h2>

        <div>
          {SERVICIOS.map((cat, i) => {
            const isOpen = openIndex === i
            const isHovered = hoveredIndex === i

            return (
              <div
                key={cat.label}
                ref={(el) => {
                  if (el) itemsRef.current[i] = el
                }}
              >
                {/* Category header - clickable */}
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
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                  }}
                >
                  {/* Number */}
                  <span
                    ref={(el) => {
                      if (el) numberRefs.current[i] = el
                    }}
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
                      color: '#ede8e0',
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

                  {/* Animated divider line replacing static border-bottom */}
                  <div
                    ref={(el) => {
                      if (el) dividerRefs.current[i] = el
                    }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'rgba(255,255,255,0.06)',
                      transformOrigin: 'left center',
                      transform: 'scaleX(0)',
                    }}
                  />
                </button>

                {/* Sub-items - animated expand */}
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
                          borderBottom:
                            j < cat.items.length - 1
                              ? '1px solid rgba(255,255,255,0.04)'
                              : 'none',
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
