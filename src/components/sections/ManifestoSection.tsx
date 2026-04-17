'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Each entry is a phrase/sentence fragment for the mask-reveal animation.
 * Bold segments are marked with <b>...</b> and parsed below.
 */
const LINES: string[] = [
  'Hacemos <b>imagenes que no se olvidan.</b>',
  'Creemos que la imagen es un <b>argumento.</b>',
  'No decoramos \u2014 construimos <b>lenguaje visual</b>',
  'que conecta marcas con personas.',
  'Cada proyecto es una pieza de',
  'comunicacion pensada para <b>quedarse.</b>',
]

function parseLine(raw: string): { segments: { text: string; bold: boolean }[] } {
  const segments: { text: string; bold: boolean }[] = []
  const regex = /<b>(.*?)<\/b>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false })
    }
    segments.push({ text: match[1], bold: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false })
  }

  return { segments }
}

export default function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const locationRef = useRef<HTMLParagraphElement>(null)
  const linesContainerRef = useRef<HTMLDivElement>(null)
  const lineInnerRefs = useRef<HTMLSpanElement[]>([])
  const boldRefs = useRef<HTMLSpanElement[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Animation 1 + 2: Per-line mask reveal, then rack-focus blur ──
      const lineInners = lineInnerRefs.current.filter(Boolean)
      const bolds = boldRefs.current.filter(Boolean)

      if (lineInners.length > 0) {
        gsap.set(lineInners, { yPercent: 105 })
        if (bolds.length > 0) {
          gsap.set(bolds, { filter: 'blur(4px)', opacity: 0.4 })
        }

        // Total mask-reveal duration: 0.9 + stagger * (lines - 1)
        const maskDuration = 0.9 + 0.12 * (lineInners.length - 1)
        // Start blur animation slightly before mask reveal finishes
        const blurStart = maskDuration - 0.35

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: linesContainerRef.current,
            start: 'top 75%',
            once: true,
          },
        })

        tl.to(lineInners, {
          yPercent: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.12,
        })

        if (bolds.length > 0) {
          tl.to(
            bolds,
            {
              filter: 'blur(0px)',
              opacity: 1,
              duration: 0.7,
              ease: 'power2.out',
              stagger: 0.08,
            },
            blurStart,
          )
        }
      }

      // ── Animation 3: Parallax drift ──
      if (labelRef.current && sectionRef.current) {
        gsap.to(labelRef.current, {
          yPercent: -30,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        })
      }

      if (locationRef.current && sectionRef.current) {
        gsap.to(locationRef.current, {
          yPercent: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        })
      }
    }, sectionRef)

    return () => {
      ctx.revert()
    }
  }, [])

  // Track bold ref index across all lines
  let boldIndex = 0

  return (
    <section
      ref={sectionRef}
      style={{
        padding: '10rem 2rem 8rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'transparent',
      }}
    >
      <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {/* Label row */}
        <div
          ref={labelRef}
          style={{
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

        {/* Primary statement — split into masked lines */}
        <div
          ref={linesContainerRef}
          style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)',
            fontWeight: 300,
            lineHeight: 1.4,
            color: '#ede8e0',
            letterSpacing: '0.01em',
            fontFamily: 'var(--font-geist-sans)',
            margin: 0,
          }}
        >
          {LINES.map((raw, i) => {
            const { segments } = parseLine(raw)
            return (
              <span
                key={i}
                style={{
                  display: 'block',
                  overflow: 'hidden',
                }}
              >
                <span
                  ref={(el) => {
                    if (el) lineInnerRefs.current[i] = el
                  }}
                  style={{ display: 'block' }}
                >
                  {segments.map((seg, j) => {
                    if (seg.bold) {
                      const currentBoldIndex = boldIndex
                      boldIndex++
                      return (
                        <span
                          key={j}
                          ref={(el) => {
                            if (el) boldRefs.current[currentBoldIndex] = el
                          }}
                          style={{
                            fontWeight: 800,
                            color: '#ede8e0',
                            display: 'inline',
                          }}
                        >
                          {seg.text}
                        </span>
                      )
                    }
                    return <span key={j}>{seg.text}</span>
                  })}
                </span>
              </span>
            )
          })}
        </div>

        {/* Location tag */}
        <p
          ref={locationRef}
          style={{
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
