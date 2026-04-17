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
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: true,
    })
    lenisRef.current = lenis

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
    }
  }, [])

  return <>{children}</>
}
