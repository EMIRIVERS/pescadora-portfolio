'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Returns a ref containing scroll progress (0–1) for a given section element.
 */
export function useScrollProgress(triggerSelector: string) {
  const progressRef = useRef(0)

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: triggerSelector,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        progressRef.current = self.progress
      },
    })
    return () => trigger.kill()
  }, [triggerSelector])

  return progressRef
}
