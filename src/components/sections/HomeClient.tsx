'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero } from '@/components/sections/Hero'
import PortfolioHeader from '@/components/sections/PortfolioHeader'
import ManifestoSection from '@/components/sections/ManifestoSection'
import PortfolioSection from '@/components/sections/PortfolioSection'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import type { PortfolioCategory } from '@/types/media'
import type { VideoEntry } from '@/types/media'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'
import SmoothScroll from '@/components/providers/SmoothScroll'
import DustParticles from '@/components/ui/DustParticles'
import CursorGlow from '@/components/ui/CursorGlow'
import AdaptiveCursor from '@/components/ui/AdaptiveCursor'

gsap.registerPlugin(ScrollTrigger)

import type { PhotoAlbum } from '@/types/media'

interface Props {
  cmsProjects: CmsProjectCard[]
  videos?: VideoEntry[]
  categories?: PortfolioCategory[]
  photoAlbums?: PhotoAlbum[]
}

function getIsTouch(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function useIsTouchDevice(): boolean {
  const [isTouch] = useState(getIsTouch)
  return isTouch
}

export default function HomeClient({ cmsProjects, videos, categories, photoAlbums }: Props) {
  const [headerVisible, setHeaderVisible] = useState(false)
  const isTouch = useIsTouchDevice()

  const heroWrapperRef = useRef<HTMLDivElement>(null)
  const colorGradeRef = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)

  /* --- Header scroll visibility --- */
  useEffect(() => {
    const onScroll = () => {
      setHeaderVisible(window.scrollY > window.innerHeight * 0.8)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* --- Section transitions (GSAP ScrollTrigger) --- */
  useEffect(() => {
    const heroWrapper = heroWrapperRef.current
    const colorGrade = colorGradeRef.current
    const vignette = vignetteRef.current
    if (!heroWrapper || !colorGrade || !vignette) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const triggers: ScrollTrigger[] = []

    if (!reducedMotion) {
      /* (a) Hero -> Portfolio "Depth Sink" */
      const depthSinkTrigger = ScrollTrigger.create({
        trigger: heroWrapper,
        start: 'bottom bottom',
        end: 'bottom top',
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress
          gsap.set(heroWrapper, {
            scale: 1 - p * 0.08,
            filter: `blur(${p * 6}px)`,
            opacity: 1 - p,
          })
        },
      })
      triggers.push(depthSinkTrigger)
    }

    /* (b) Color grade shift — HSL values precomputed so onUpdate only does cheap math */
    const colorStops: { pos: number; hsl: [number, number, number] }[] = [
      { pos: 0,    hsl: [220, 30, 20] },
      { pos: 0.25, hsl: [35,  40, 25] },
      { pos: 0.50, hsl: [200, 15, 15] },
      { pos: 0.75, hsl: [185, 25, 18] },
      { pos: 1.0,  hsl: [40,  35, 22] },
    ]

    if (!reducedMotion) {
      const colorGradeTrigger = ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress
          let lower = colorStops[0]
          let upper = colorStops[colorStops.length - 1]
          for (let i = 0; i < colorStops.length - 1; i++) {
            if (p >= colorStops[i].pos && p <= colorStops[i + 1].pos) {
              lower = colorStops[i]
              upper = colorStops[i + 1]
              break
            }
          }
          const segRange = upper.pos - lower.pos
          const segProgress = segRange > 0 ? (p - lower.pos) / segRange : 0
          const h = Math.round(lower.hsl[0] + (upper.hsl[0] - lower.hsl[0]) * segProgress)
          const s = Math.round(lower.hsl[1] + (upper.hsl[1] - lower.hsl[1]) * segProgress)
          const l = Math.round(lower.hsl[2] + (upper.hsl[2] - lower.hsl[2]) * segProgress)
          colorGrade.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`
        },
      })
      triggers.push(colorGradeTrigger)
    } else {
      // Apply the first color stop statically so the grade overlay is still present.
      const [h, s, l] = colorStops[0].hsl
      colorGrade.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`
    }

    if (!reducedMotion) {
      /* (c) Breathing vignette */
      const vignetteTrigger = ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress
          const boundaries = [0.2, 0.4, 0.6, 0.8]
          let closestDist = 1
          for (const b of boundaries) {
            const dist = Math.abs(p - b)
            if (dist < closestDist) closestDist = dist
          }
          const tightness = closestDist < 0.05 ? 1 - closestDist / 0.05 : 0
          const innerStop = 50 - tightness * 20
          const opacity = 0.35 + tightness * 0.20
          vignette.style.background = `radial-gradient(ellipse at center, transparent ${innerStop}%, rgba(0,0,0,${opacity}) 100%)`
        },
      })
      triggers.push(vignetteTrigger)
    }

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [])

  return (
    <>
      {/* Ambient effects -- cursor effects hidden on touch devices */}
      {!isTouch && <DustParticles />}
      {!isTouch && <CursorGlow />}
      {!isTouch && <AdaptiveCursor />}

      {/* Color grade overlay */}
      <div
        ref={colorGradeRef}
        style={{
          position: 'fixed',
          inset: 0,
          mixBlendMode: 'color',
          opacity: 0.05,
          pointerEvents: 'none',
          zIndex: 9998,
          backgroundColor: 'hsl(220, 30%, 20%)',
        }}
      />

      {/* Breathing vignette overlay */}
      <div
        ref={vignetteRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)',
          pointerEvents: 'none',
          zIndex: 9997,
        }}
      />

      <SmoothScroll>
        <PortfolioHeader visible={headerVisible} />

        <main style={{ position: 'relative', zIndex: 1 }}>
          <div ref={heroWrapperRef} style={{ willChange: 'transform, filter, opacity' }}>
            <Hero />
          </div>
          <div style={{ backgroundColor: '#050505' }}>
            <PortfolioSection cmsProjects={cmsProjects} videos={videos} categories={categories} photoAlbums={photoAlbums} />
            <ManifestoSection />
            <ServiciosSection />

            {/* CTA -- Cotiza tu proyecto */}
            <div style={{
              padding: 'clamp(2.5rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#6b6560',
              }}>
                Listo para crear?
              </span>
              <a
                href="/cotiza"
                data-cursor="link"
                style={{
                  fontFamily: 'var(--font-geist-sans)',
                  fontWeight: 700,
                  fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#ede8e0',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '1rem 2.5rem',
                  transition: 'all 0.3s ease',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.background = '#e8341a'
                  el.style.borderColor = '#e8341a'
                  el.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'transparent'
                  el.style.borderColor = 'rgba(255,255,255,0.15)'
                  el.style.color = '#ede8e0'
                }}
              >
                Cotiza tu proyecto
              </a>
              <div style={{
                width: '100%',
                maxWidth: '600px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                marginTop: '2rem',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <span style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#3a3632',
                  whiteSpace: 'nowrap',
                }}>
                  Hablemos
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>

            <ContactoSection />
          </div>
        </main>

        <footer
          style={{
            background: 'var(--color-bg)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '2rem clamp(1.2rem, 4vw, 2rem)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem 1.5rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.8rem', color: '#ede8e0' }}>
            XICO Films
          </span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b6560' }}>
            Productora audiovisual · México
          </span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#3a3632' }}>
            © {new Date().getFullYear()} XICO Films
          </span>
        </footer>
      </SmoothScroll>
    </>
  )
}
