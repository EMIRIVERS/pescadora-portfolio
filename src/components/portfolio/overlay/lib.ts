'use client'

import { useEffect, useState } from 'react'

/** SSR-safe initial mobile check for the overlay breakpoint. */
function getInitialMobileOverlay(breakpoint: number): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
}

/** Tracks whether the overlay should use its mobile layout. */
export function useIsMobileOverlay(breakpoint = 640): boolean {
  const [mobile, setMobile] = useState(() => getInitialMobileOverlay(breakpoint))
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return mobile
}

/**
 * Traps keyboard focus within `containerRef` while mounted.
 * Returns focus to `returnRef` on cleanup.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  returnRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Move focus into the overlay on mount
    const firstFocusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        container!.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null) // exclude hidden

      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the overlay
      returnRef.current?.focus()
    }
    // Refs are stable — deps intentionally omitted for mount/unmount-only behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Builds the clip-path inset that reveals the overlay from the source card. */
export function rectToClipInset(origin: { x: number; y: number; w: number; h: number }): string {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
  const top = origin.y
  const right = vw - (origin.x + origin.w)
  const bottom = vh - (origin.y + origin.h)
  const left = origin.x
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 0px)`
}
