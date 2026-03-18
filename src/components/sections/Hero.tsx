'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { ParticleWordmark } from '@/components/ui/ParticleWordmark'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const metaRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Particle canvas fades + translates up on scroll
      gsap.to(canvasWrapRef.current, {
        y: '-12vh',
        opacity: 0.15,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Tagline / meta fades faster
      gsap.to(metaRef.current, {
        y: '-8vh',
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '50% top',
          scrub: true,
        },
      })

      // Scroll indicator disappears on first scroll
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
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Particle wordmark — fills the hero area */}
      <div
        ref={canvasWrapRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
        }}
      >
        <ParticleWordmark />
      </div>

      {/* Tagline — overlaid at bottom of hero */}
      <div
        ref={metaRef}
        style={{
          position: 'absolute',
          bottom: '6rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontWeight: 300,
            fontSize: 'clamp(0.6rem, 1.2vw, 0.8rem)',
            letterSpacing: '0.3em',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            margin: 0,
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
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 1,
            height: 48,
            background: 'var(--color-border)',
            margin: '0 auto',
          }}
        />
      </div>
    </section>
  )
}
