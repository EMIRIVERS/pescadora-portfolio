'use client'

import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'

interface MagneticHoverOptions {
  distance?: number
  strength?: number
}

export default function useMagneticHover(
  ref: RefObject<HTMLElement | null>,
  options?: MagneticHoverOptions
) {
  const distance = options?.distance ?? 60
  const strength = options?.strength ?? 12

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const textChild = el.querySelector<HTMLElement>('*')

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.max(rect.width, rect.height) / 2 + distance

      if (dist < maxDist) {
        // Normalize displacement within range, clamped to strength
        const factor = 1 - dist / maxDist
        const moveX = (dx / maxDist) * strength * factor
        const moveY = (dy / maxDist) * strength * factor

        gsap.to(el, {
          x: moveX,
          y: moveY,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        })

        if (textChild) {
          gsap.to(textChild, {
            x: moveX * 0.4,
            y: moveY * 0.4,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true,
          })
        }
      }
    }

    const onMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 1,
        ease: 'elastic.out(1, 0.4)',
        overwrite: true,
      })

      if (textChild) {
        gsap.to(textChild, {
          x: 0,
          y: 0,
          duration: 1,
          ease: 'elastic.out(1, 0.4)',
          overwrite: true,
        })
      }
    }

    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)

    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      gsap.killTweensOf(el)
      if (textChild) {
        gsap.killTweensOf(textChild)
      }
    }
  }, [ref, distance, strength])
}
