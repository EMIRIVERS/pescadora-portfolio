'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface WebGLCanvasProps {
  onSceneReady?: (scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => void
}

export function WebGLCanvas({ onSceneReady }: WebGLCanvasProps) {
  const mountRef = useRef<HTMLCanvasElement>(null)
  // Hold the latest callback in a ref so the effect runs only once on mount
  // and never re-initialises the WebGL context when the parent re-renders.
  const onSceneReadyRef = useRef(onSceneReady)
  useEffect(() => { onSceneReadyRef.current = onSceneReady })

  useEffect(() => {
    const canvas = mountRef.current
    if (!canvas) return

    // Disable on mobile
    if (window.innerWidth < 768) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f2ede6')

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 5)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Render loop
    let animId: number
    const tick = () => {
      animId = requestAnimationFrame(tick)
      renderer.render(scene, camera)
    }
    tick()

    onSceneReadyRef.current?.(scene, camera, renderer)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, []) // empty — intentional: WebGL context must init exactly once

  return (
    <canvas
      ref={mountRef}
      className="webgl"
      aria-label="Galería visual interactiva de Pescadora"
    />
  )
}
