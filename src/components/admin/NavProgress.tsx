'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function NavProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    // Clear any in-flight timers
    if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    if (fadeTimer.current !== null) clearTimeout(fadeTimer.current)

    setFading(false)
    setVisible(true)

    // After the fill animation (0.4s) keep bar visible briefly then fade
    hideTimer.current = setTimeout(() => {
      setFading(true)
      fadeTimer.current = setTimeout(() => {
        setVisible(false)
        setFading(false)
      }, 200)
    }, 450)

    return () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current)
      if (fadeTimer.current !== null) clearTimeout(fadeTimer.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes progress-fill {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 9999,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: fading ? 0 : 1,
          transition: fading ? 'opacity 0.2s ease' : 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--dash-accent, #7c6cfc)',
            animation: 'progress-fill 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
          }}
        />
      </div>
    </>
  )
}
