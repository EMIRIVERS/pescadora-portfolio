'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Lenis smooth-scroll provider.
 * Bridges Lenis → GSAP ScrollTrigger so all scrub/pin logic stays in sync.
 * Exposes scroll velocity on `document.documentElement` as a CSS custom prop
 * `--scroll-velocity` for any component that wants it.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // Reduced-motion users get native scroll — Lenis hijacking scroll is a
    // known accessibility/vestibular issue (WCAG 2.3.3).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: true,
    })
    lenisRef.current = lenis
    // Expose so the fixed header (and any anchor) can drive scroll through
    // Lenis. Native scrollIntoView/window.scrollTo are swallowed by Lenis.
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

    // Bridge Lenis → ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    const ctx = gsap.context(() => {
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000)
      })
      gsap.ticker.lagSmoothing(0)
    })

    return () => {
      ctx.revert()
      lenis.destroy()
      delete (window as unknown as { __lenis?: Lenis }).__lenis
    }
  }, [])

  return <>{children}</>
}
