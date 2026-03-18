'use client'
import { useEffect, useRef } from 'react'

type CursorState = 'default' | 'hover-image' | 'hover-link'

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<CursorState>('default')
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const LERP_FACTOR = 0.08

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const onEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="image"]')) {
        stateRef.current = 'hover-image'
      } else if (target.closest('a, button, [data-cursor="link"]')) {
        stateRef.current = 'hover-link'
      }
    }
    const onLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.closest('[data-cursor="image"]') ||
        target.closest('a, button, [data-cursor="link"]')
      ) {
        stateRef.current = 'default'
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    const tick = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP_FACTOR
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP_FACTOR

      cursor.style.transform = `translate(${currentRef.current.x}px, ${currentRef.current.y}px)`
      cursor.dataset.state = stateRef.current
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] -translate-x-1/2 -translate-y-1/2"
      style={{ willChange: 'transform' }}
    >
      <div
        className="cursor-dot rounded-full transition-all duration-300"
        data-cursor-dot
        style={{
          width: 8,
          height: 8,
          background: 'var(--color-ink)',
          mixBlendMode: 'difference',
        }}
      />
    </div>
  )
}
