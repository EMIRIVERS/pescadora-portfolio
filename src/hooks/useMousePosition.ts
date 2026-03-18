'use client'
import { useEffect, useRef } from 'react'

export interface MousePosition {
  x: number
  y: number
  /** Normalized 0–1 relative to viewport */
  nx: number
  ny: number
}

/**
 * Tracks mouse position with RAF. Returns a ref (not state) to avoid re-renders.
 * Components that need the position read it from the ref in their own RAF loop.
 */
export function useMousePosition() {
  const posRef = useRef<MousePosition>({ x: 0, y: 0, nx: 0, ny: 0 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      posRef.current = {
        x: e.clientX,
        y: e.clientY,
        nx: e.clientX / window.innerWidth,
        ny: e.clientY / window.innerHeight,
      }
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return posRef
}
