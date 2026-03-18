'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { Wordmark } from '@/components/ui/Wordmark'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Wordmark slides up and fades on scroll
      gsap.to(wordmarkRef.current, {
        y: '-20vh',
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Scroll indicator fades immediately on first scroll
      gsap.to(indicatorRef.current, {
        opacity: 0,
        y: 10,
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '5% top',
          scrub: true,
        },
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      id="hero"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div ref={wordmarkRef} style={{ textAlign: 'center' }}>
        <Wordmark />
        <p
          style={{
            marginTop: '1.5rem',
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
            letterSpacing: '0.2em',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Fotografía · Video · México
        </p>
      </div>

      {/* Scroll indicator — single vertical line */}
      <div
        ref={indicatorRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          style={{
            width: 1,
            height: 60,
            background: 'var(--color-border)',
            margin: '0 auto',
          }}
        />
      </div>
    </section>
  )
}
