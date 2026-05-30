'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'

type CursorState = 'default' | 'link' | 'view'

export default function AdaptiveCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const [cursorState, setCursorState] = useState<CursorState>('default')
  const quickToXRef = useRef<gsap.QuickToFunc | null>(null)
  const quickToYRef = useRef<gsap.QuickToFunc | null>(null)

  const handleMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const cursorEl = target.closest<HTMLElement>('[data-cursor]')
    if (cursorEl) {
      const val = cursorEl.getAttribute('data-cursor')
      if (val === 'link' || val === 'view') {
        setCursorState(val)
        return
      }
    }
    setCursorState('default')
  }, [])

  useEffect(() => {
    // Touch devices never get a custom cursor. The parent only mounts this on
    // non-touch (`!isTouch && <AdaptiveCursor />`), but guard here too so we
    // never inject `cursor: none` or listeners on a coarse pointer.
    if (window.matchMedia('(pointer: coarse)').matches) return

    const dot = dotRef.current
    if (!dot) return

    // Inject global cursor-hide style
    const style = document.createElement('style')
    style.textContent = '* { cursor: none !important; }'
    document.head.appendChild(style)

    // GSAP quickTo for smooth position tracking
    quickToXRef.current = gsap.quickTo(dot, 'x', { duration: 0.15, ease: 'power2.out' })
    quickToYRef.current = gsap.quickTo(dot, 'y', { duration: 0.15, ease: 'power2.out' })

    const onMouseMove = (e: MouseEvent) => {
      quickToXRef.current?.(e.clientX)
      quickToYRef.current?.(e.clientY)
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseover', handleMouseOver)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', handleMouseOver)
      document.head.removeChild(style)
      quickToXRef.current = null
      quickToYRef.current = null
    }
  }, [handleMouseOver])

  const isLink = cursorState === 'link'
  const isView = cursorState === 'view'

  const outerSize = isView ? 80 : isLink ? 40 : 6
  const showDot = isLink
  const backgroundColor = isView
    ? 'rgba(255, 255, 255, 0.06)'
    : isLink
      ? 'transparent'
      : 'white'
  const border = isLink ? '1px solid rgba(255, 255, 255, 0.5)' : 'none'

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: outerSize,
        height: outerSize,
        marginLeft: -outerSize / 2,
        marginTop: -outerSize / 2,
        borderRadius: '50%',
        backgroundColor,
        border,
        mixBlendMode: cursorState === 'default' ? 'difference' : undefined,
        pointerEvents: 'none',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1), margin 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), border 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {showDot && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'white',
          }}
        />
      )}
    </div>
  )
}
