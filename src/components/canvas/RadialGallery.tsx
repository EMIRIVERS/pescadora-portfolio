'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { createPhotoPlane, type PhotoPlaneInstance } from './PhotoPlane'
import { useMousePosition } from '@/hooks/useMousePosition'
import { registry } from '@/lib/registry'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const MAX_VISIBLE = 20
const ARC_RADIUS = 4
const ARC_SPREAD = Math.PI * 1.2

interface RadialGalleryProps {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sectionSelector: string
}

export function RadialGallery({ scene, camera, sectionSelector }: RadialGalleryProps) {
  const mouseRef = useMousePosition()
  const planesRef = useRef<PhotoPlaneInstance[]>([])
  const clockRef = useRef(new THREE.Clock())
  const rafRef = useRef<number>(0)

  const init = useCallback(async () => {
    const photos = registry.photos.slice(0, MAX_VISIBLE)

    const planes = await Promise.all(
      photos.map((photo, i) => {
        const angle = (i / (photos.length - 1)) * ARC_SPREAD - ARC_SPREAD / 2
        const x = Math.sin(angle) * ARC_RADIUS
        const z = -Math.cos(angle) * ARC_RADIUS + ARC_RADIUS
        return createPhotoPlane({
          url: photo.url,
          position: new THREE.Vector3(x, 0, z),
          scene,
        })
      })
    )
    planesRef.current = planes
  }, [scene])

  useEffect(() => {
    init()

    const trigger = ScrollTrigger.create({
      trigger: sectionSelector,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        const angle = (self.progress - 0.5) * ARC_SPREAD
        gsap.to(camera.position, {
          x: Math.sin(angle) * ARC_RADIUS * 0.7,
          z: 5 + self.progress * 2,
          duration: 0.3,
          overwrite: true,
        })
        camera.lookAt(Math.sin(angle) * ARC_RADIUS * 0.3, 0, 0)
      },
    })

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      const t = clockRef.current.getElapsedTime()
      const { nx, ny } = mouseRef.current
      planesRef.current.forEach((p) => p.update(t, nx, ny, 0.6))
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      trigger.kill()
      cancelAnimationFrame(rafRef.current)
      planesRef.current.forEach((p) => p.dispose())
      planesRef.current = []
    }
  }, [init, sectionSelector, camera, mouseRef])

  return null
}
