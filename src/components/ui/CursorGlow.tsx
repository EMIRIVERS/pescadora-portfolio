'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    // Hide on touch devices
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    if (isTouchDevice) {
      el.style.display = 'none'
      return
    }

    let currentX = 0
    let currentY = 0
    let targetX = 0
    let targetY = 0
    let rafId = 0
    let ticking = false

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY

      if (!ticking) {
        ticking = true
        rafId = requestAnimationFrame(updatePosition)
      }
    }

    const updatePosition = () => {
      // Lerp for smooth follow
      currentX += (targetX - currentX) * 0.15
      currentY += (targetY - currentY) * 0.15

      el.style.setProperty('--mx', `${currentX}px`)
      el.style.setProperty('--my', `${currentY}px`)

      // Keep animating if not yet converged
      const dx = Math.abs(targetX - currentX)
      const dy = Math.abs(targetY - currentY)
      if (dx > 0.5 || dy > 0.5) {
        rafId = requestAnimationFrame(updatePosition)
      } else {
        ticking = false
      }
    }

    window.addEventListener('mousemove', onMouseMove)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9980,
        background:
          'radial-gradient(circle 400px at var(--mx, -200px) var(--my, -200px), rgba(255,245,230,0.02), transparent 70%)',
      }}
    />
  )
}
