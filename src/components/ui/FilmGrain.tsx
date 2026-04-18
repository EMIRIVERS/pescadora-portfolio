'use client'

import { useEffect, useRef } from 'react'

const GRAIN_SIZE = 128
const TARGET_FPS = 12
const FRAME_INTERVAL = 1000 / TARGET_FPS
const PULSE_PERIOD = 8000 // 8s sine wave

export default function FilmGrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = GRAIN_SIZE
    canvas.height = GRAIN_SIZE

    const imageData = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE)
    const pixels = imageData.data

    let lastFrameTime = 0
    let animId = 0

    const render = (time: number) => {
      animId = requestAnimationFrame(render)

      if (time - lastFrameTime < FRAME_INTERVAL) return
      lastFrameTime = time

      // Fill with random grayscale noise
      for (let i = 0; i < pixels.length; i += 4) {
        const v = Math.random() * 255
        pixels[i] = v
        pixels[i + 1] = v
        pixels[i + 2] = v
        pixels[i + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)

      // Opacity pulse: sine wave between 0.03 and 0.05
      const pulse = 0.04 + 0.01 * Math.sin((time / PULSE_PERIOD) * Math.PI * 2)
      canvas.style.opacity = String(pulse)
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: 0.04,
        imageRendering: 'pixelated',
      }}
    />
  )
}
