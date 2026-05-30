'use client'

import { useState, useEffect } from 'react'

export function useCountUp(target: number, duration = 0.8): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const startTime = performance.now()
    const durationMs = duration * 1000

    let rafId: number

    // Animate toward `target`; when target is 0 this settles at 0 on the first
    // frame (no synchronous setState needed in the effect body).
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])

  return count
}
