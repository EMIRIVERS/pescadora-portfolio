'use client'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CONTACT_EMAIL = 'hola@xicofilms.com'

const SUBTITLE_TEXT = 'Video  \u00B7  Fotograf\u00EDa  \u00B7  Direcci\u00F3n Creativa  \u00B7  Redes Sociales'

export function ContactoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const emailLinkRef = useRef<HTMLAnchorElement>(null)
  const waLinkRef = useRef<HTMLAnchorElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  const line1Ref = useRef<HTMLSpanElement>(null)
  const line2Ref = useRef<HTMLSpanElement>(null)
  const line3Ref = useRef<HTMLSpanElement>(null)

  const [emailHovered, setEmailHovered] = useState(false)
  const [waHovered, setWaHovered] = useState(false)

  const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? ''

  useEffect(() => {
    const section = sectionRef.current
    const line1 = line1Ref.current
    const line2 = line2Ref.current
    const line3 = line3Ref.current
    const subtitle = subtitleRef.current
    const cursor = cursorRef.current
    const emailLink = emailLinkRef.current
    const waLink = waLinkRef.current
    const footer = footerRef.current

    if (!section || !line1 || !line2 || !line3 || !subtitle || !cursor || !emailLink || !footer) return

    // --- Set initial states ---

    // Heading lines: inner spans start pushed down
    gsap.set([line1, line2, line3], { yPercent: 110 })

    // Subtitle characters: build char spans
    const chars = subtitle.querySelectorAll<HTMLSpanElement>('.char-span')
    gsap.set(chars, { opacity: 0 })

    // Cursor
    gsap.set(cursor, { opacity: 0 })

    // Contact links
    gsap.set(emailLink, { x: -60, opacity: 0 })
    if (waLink) gsap.set(waLink, { x: 60, opacity: 0 })

    // Footer
    gsap.set(footer, { opacity: 0 })

    // --- Build master timeline ---
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        once: true,
      },
    })

    // Animation 1: Per-line mask reveal with accelerating stagger
    tl.to(line1, { yPercent: 0, duration: 0.8, ease: 'power3.out' })
      .to(line2, { yPercent: 0, duration: 0.7, ease: 'power3.out' }, '-=0.4')
      .to(line3, { yPercent: 0, duration: 0.6, ease: 'power3.out' }, '-=0.35')

    // Animation 2: Typewriter effect on subtitle
    tl.to(chars, {
      opacity: 1,
      duration: 0.01,
      stagger: 0.025,
    })

    // Blinking cursor: pulse 3 times then fade
    tl.to(cursor, { opacity: 1, duration: 0.01 })
      .to(cursor, {
        opacity: 0,
        duration: 0.3,
        repeat: 5,
        yoyo: true,
        ease: 'steps(1)',
      })
      .to(cursor, { opacity: 0, duration: 0.2 })

    // Animation 3: Split-direction slide on contact links
    const linkTargets: gsap.TweenTarget[] = [emailLink]
    if (waLink) linkTargets.push(waLink)

    tl.to(emailLink, { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, '<')
    if (waLink) {
      tl.to(waLink, { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, '<')
    }

    // Footer fade in after links
    tl.to(footer, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '+=0.3')

    const st = tl.scrollTrigger
    const triggers: ScrollTrigger[] = []
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

  // Build character spans for the subtitle typewriter effect
  const subtitleChars = SUBTITLE_TEXT.split('').map((char, i) => (
    <span
      key={i}
      className="char-span"
      style={{ display: 'inline-block', whiteSpace: 'pre' }}
    >
      {char}
    </span>
  ))

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
              fontSize: 'clamp(3.2rem, 12vw, 10rem)',
              letterSpacing: '-0.02em',
              lineHeight: 0.88,
              color: '#ede8e0',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            <span style={{ display: 'block', overflow: 'hidden' }}>
              <span ref={line1Ref} style={{ display: 'block' }}>QUE HISTORIA</span>
            </span>
            <span style={{ display: 'block', overflow: 'hidden' }}>
              <span ref={line2Ref} style={{ display: 'block' }}>QUIERES</span>
            </span>
            <span style={{ display: 'block', overflow: 'hidden' }}>
              <span ref={line3Ref} style={{ display: 'block', color: '#e8341a' }}>CONTAR?</span>
            </span>
          </h2>
          <p
            ref={subtitleRef}
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 'clamp(0.65rem, 1.2vw, 0.9rem)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#444',
              marginTop: '2rem',
              lineHeight: 1.8,
            }}
          >
            {subtitleChars}
            <span
              ref={cursorRef}
              style={{
                display: 'inline-block',
                width: '0.6em',
                height: '1em',
                backgroundColor: '#444',
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
              }}
            />
          </p>
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
            ref={emailLinkRef}
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
              ref={waLinkRef}
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
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#6b6560',
              }}
            >
              XICO Films &mdash; {new Date().getFullYear()}
            </span>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <a
                href="https://instagram.com/xicofilms"
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="link"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#6b6560',
                  textDecoration: 'none',
                  transition: 'color 0.25s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#ede8e0' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#6b6560' }}
              >
                Instagram
              </a>
              <a
                href="https://vimeo.com/xicofilms"
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="link"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#6b6560',
                  textDecoration: 'none',
                  transition: 'color 0.25s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#ede8e0' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#6b6560' }}
              >
                Vimeo
              </a>
            </div>
          </div>

          <p style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.5rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#3a3632',
            marginTop: '1.5rem',
            marginBottom: 0,
          }}>
            Mexico &mdash; Activos donde el trabajo lo exige
          </p>
        </div>

      </div>
    </section>
  )
}
