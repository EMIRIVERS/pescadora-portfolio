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
import FilmGrain from '@/components/ui/FilmGrain'
import DustParticles from '@/components/ui/DustParticles'
import CursorGlow from '@/components/ui/CursorGlow'
import AdaptiveCursor from '@/components/ui/AdaptiveCursor'
import CinemaPreloader from '@/components/ui/CinemaPreloader'

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
  const [preloaderDone, setPreloaderDone] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const isTouch = useIsTouchDevice()

  const heroWrapperRef = useRef<HTMLDivElement>(null)
  const colorGradeRef = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)

  /* --- Lock body scroll during preloader --- */
  useEffect(() => {
    if (!preloaderDone) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [preloaderDone])

  /* --- Header scroll visibility --- */
  useEffect(() => {
    const onScroll = () => {
      setHeaderVisible(window.scrollY > window.innerHeight * 3.5)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* --- Section transitions (GSAP ScrollTrigger) --- */
  useEffect(() => {
    if (!preloaderDone) return

    const heroWrapper = heroWrapperRef.current
    const colorGrade = colorGradeRef.current
    const vignette = vignetteRef.current
    if (!heroWrapper || !colorGrade || !vignette) return

    const triggers: ScrollTrigger[] = []

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

    /* (b) Color grade shift */
    const colorStops: { pos: number; color: string }[] = [
      { pos: 0, color: 'hsl(220, 30%, 20%)' },
      { pos: 0.25, color: 'hsl(35, 40%, 25%)' },
      { pos: 0.50, color: 'hsl(200, 15%, 15%)' },
      { pos: 0.75, color: 'hsl(185, 25%, 18%)' },
      { pos: 1.0, color: 'hsl(40, 35%, 22%)' },
    ]

    const colorGradeTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress
        // Find the two surrounding color stops
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

        // Parse HSL values for interpolation
        const lMatch = lower.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
        const uMatch = upper.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
        if (lMatch && uMatch) {
          const h = Math.round(Number(lMatch[1]) + (Number(uMatch[1]) - Number(lMatch[1])) * segProgress)
          const s = Math.round(Number(lMatch[2]) + (Number(uMatch[2]) - Number(lMatch[2])) * segProgress)
          const l = Math.round(Number(lMatch[3]) + (Number(uMatch[3]) - Number(lMatch[3])) * segProgress)
          colorGrade.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`
        }
      },
    })
    triggers.push(colorGradeTrigger)

    /* (c) Breathing vignette */
    const vignetteTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress
        // Section boundaries at 0.2, 0.4, 0.6, 0.8
        const boundaries = [0.2, 0.4, 0.6, 0.8]
        let closestDist = 1
        for (const b of boundaries) {
          const dist = Math.abs(p - b)
          if (dist < closestDist) closestDist = dist
        }
        // When close to boundary (within 5%), tighten; otherwise relax
        const tightness = closestDist < 0.05
          ? 1 - closestDist / 0.05
          : 0

        const innerStop = 50 - tightness * 20  // 50% -> 30%
        const opacity = 0.35 + tightness * 0.20 // 0.35 -> 0.55

        vignette.style.background = `radial-gradient(ellipse at center, transparent ${innerStop}%, rgba(0,0,0,${opacity}) 100%)`
      },
    })
    triggers.push(vignetteTrigger)

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [preloaderDone])

  return (
    <>
      {/* Preloader */}
      {!preloaderDone && (
        <CinemaPreloader
          progress={loadProgress}
          onComplete={() => setPreloaderDone(true)}
        />
      )}

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
            <Hero
              onLoadProgress={setLoadProgress}
              initialBlur={true}
            />
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
      </SmoothScroll>
    </>
  )
}
