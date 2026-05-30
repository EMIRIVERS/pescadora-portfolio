'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  freqX: number
  freqY: number
  offsetX: number
  offsetY: number
  driftX: number
  driftY: number
  color: [number, number, number]
}

const PARTICLE_COUNT = 40
const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS

function createParticle(w: number, h: number): Particle {
  const colorRoll = Math.random()
  let color: [number, number, number]
  if (colorRoll < 0.5) {
    // warm white
    color = [255, 250, 240]
  } else if (colorRoll < 0.8) {
    // faint amber
    color = [255, 220, 160]
  } else {
    // cool blue tint
    color = [200, 220, 255]
  }

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: 1 + Math.random() * 3,
    opacity: 0.03 + Math.random() * 0.09,
    freqX: 0.0003 + Math.random() * 0.001,
    freqY: 0.0002 + Math.random() * 0.0008,
    offsetX: Math.random() * Math.PI * 2,
    offsetY: Math.random() * Math.PI * 2,
    driftX: (Math.random() - 0.5) * 0.15,
    driftY: -0.05 - Math.random() * 0.1,
    color,
  }
}

export default function DustParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = Math.floor(window.innerWidth / 2)
    let h = Math.floor(window.innerHeight / 2)
    canvas.width = w
    canvas.height = h

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(w, h)
    )

    const drawParticle = (p: Particle, brownX: number, brownY: number) => {
      const drawX = p.x + brownX
      const drawY = p.y + brownY
      const [r, g, b] = p.color

      if (p.size > 2.5) {
        // Larger particles get slight blur via radial gradient
        const grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, p.size * 1.5)
        grad.addColorStop(0, `rgba(${r},${g},${b},${p.opacity})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(drawX, drawY, p.size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
        ctx.beginPath()
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const handleResize = () => {
      w = Math.floor(window.innerWidth / 2)
      h = Math.floor(window.innerHeight / 2)
      canvas.width = w
      canvas.height = h
    }

    // Respect prefers-reduced-motion: draw a single static frame, no rAF loop.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        drawParticle(p, 0, 0)
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    let lastFrameTime = 0
    let animId = 0

    const render = (time: number) => {
      animId = requestAnimationFrame(render)

      if (time - lastFrameTime < FRAME_INTERVAL) return
      lastFrameTime = time

      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        // Brownian-like motion via sine waves
        const brownX = Math.sin(time * p.freqX + p.offsetX) * 20
        const brownY = Math.sin(time * p.freqY + p.offsetY) * 15

        p.x += p.driftX
        p.y += p.driftY

        // Wrap around edges
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        drawParticle(p, brownX, brownY)
      }
    }

    animId = requestAnimationFrame(render)

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9985,
      }}
    />
  )
}
