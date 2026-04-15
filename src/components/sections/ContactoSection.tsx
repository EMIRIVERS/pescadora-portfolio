'use client'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CONTACT_EMAIL = 'hola@carajofilms.com'

export function ContactoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  const [emailHovered, setEmailHovered] = useState(false)
  const [waHovered, setWaHovered] = useState(false)

  const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? ''

  useEffect(() => {
    const section = sectionRef.current
    const heading = headingRef.current
    const links = linksRef.current
    const footer = footerRef.current

    if (!section || !heading || !links || !footer) return

    const triggers: ScrollTrigger[] = []

    gsap.set(heading, { y: 30, opacity: 0 })
    gsap.set(links, { y: 20, opacity: 0 })
    gsap.set(footer, { opacity: 0 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        once: true,
      },
    })

    tl.to(heading, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' })
      .to(links, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, '+=0.15')
      .to(footer, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '+=0.3')

    const st = tl.scrollTrigger
    if (st) triggers.push(st)

    return () => {
      triggers.forEach((t) => t.kill())
      tl.kill()
    }
  }, [])

  const linkStyle = (hovered: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-geist-mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: hovered ? '#ede8e0' : '#6b6560',
    textDecoration: 'none',
    transition: 'color 0.25s ease',
    cursor: 'pointer',
  })

  return (
    <section
      ref={sectionRef}
      id="contacto"
      style={{
        padding: '8rem 2rem 4rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#050505',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Big typographic statement */}
        <div ref={headingRef}>
          <h2
            style={{
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 900,
              fontSize: 'clamp(4rem, 14vw, 12rem)',
              letterSpacing: '-0.02em',
              lineHeight: 0.85,
              color: '#ede8e0',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            <span style={{ display: 'block' }}>HACEMOS</span>
            <span style={{ display: 'block' }}>ALGO?</span>
          </h2>
        </div>

        {/* Contact links row */}
        <div
          ref={linksRef}
          style={{
            marginTop: '4rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2.5rem',
            alignItems: 'center',
          }}
        >
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={linkStyle(emailHovered)}
            data-cursor="link"
            onMouseEnter={() => setEmailHovered(true)}
            onMouseLeave={() => setEmailHovered(false)}
          >
            {CONTACT_EMAIL}
          </a>

          {WA_NUMBER && (
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle(waHovered)}
              data-cursor="link"
              onMouseEnter={() => setWaHovered(true)}
              onMouseLeave={() => setWaHovered(false)}
            >
              WhatsApp
            </a>
          )}
        </div>

        {/* Footer */}
        <div
          ref={footerRef}
          style={{
            marginTop: '6rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#6b6560',
            }}
          >
            Carajo Films
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#6b6560',
            }}
          >
            @carajofilms
          </span>
        </div>

      </div>
    </section>
  )
}
