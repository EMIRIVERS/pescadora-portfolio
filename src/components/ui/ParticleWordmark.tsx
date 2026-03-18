'use client'
import { useRef, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FishParticle {
  x: number
  y: number
  baseX: number
  baseY: number
  color: string
  size: number
  density: number
  angle: number        // current rendered angle
  targetAngle: number  // lerp target
}

// ---------------------------------------------------------------------------
// Draw a single fish: ellipse body + triangular tail
// ---------------------------------------------------------------------------
function drawFish(ctx: CanvasRenderingContext2D, p: FishParticle): void {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  ctx.fillStyle = p.color

  // Body — elongated ellipse
  ctx.beginPath()
  ctx.ellipse(0, 0, p.size * 2.2, p.size * 0.8, 0, 0, Math.PI * 2)
  ctx.fill()

  // Tail — triangle pointing left (behind fish body)
  ctx.beginPath()
  ctx.moveTo(-p.size * 1.8, 0)
  ctx.lineTo(-p.size * 3.4, -p.size * 1.0)
  ctx.lineTo(-p.size * 3.4, p.size * 1.0)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// Shortest angular distance helper
function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * t
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ParticleWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctx2d = canvasEl.getContext('2d')
    if (!ctx2d) return

    // Capture non-null refs so closures below don't confuse TypeScript
    const canvas = canvasEl
    const ctx = ctx2d

    const mouse = { x: -9999, y: -9999, radius: 130 }
    let particles: FishParticle[] = []
    let rafId = 0

    // ------------------------------------------------------------------
    // Build particle array from rasterised text
    // ------------------------------------------------------------------
    function init(): void {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = w
      canvas.height = h

      particles = []
      ctx.clearRect(0, 0, w, h)

      // Font size — scales with container, capped
      const fontSize = Math.max(40, Math.min(w / 5.5, 130))

      ctx.font = `200 ${fontSize}px Geist, "Helvetica Neue", Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // letterSpacing supported in Chrome 99+, Firefox 112+, Safari 17+
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        `${fontSize * 0.28}px`

      ctx.fillStyle = '#2a2520'
      ctx.fillText('PESCADORA', w / 2, h / 2)

      const imageData = ctx.getImageData(0, 0, w, h)
      ctx.clearRect(0, 0, w, h)

      const gap = 5 // sample every N px
      for (let y = 0; y < imageData.height; y += gap) {
        for (let x = 0; x < imageData.width; x += gap) {
          const alpha = imageData.data[(y * imageData.width + x) * 4 + 3]
          if (alpha > 128) {
            const startAngle = (Math.random() - 0.5) * 0.6 // gentle variation
            particles.push({
              x,
              y,
              baseX: x,
              baseY: y,
              color: '#2a2520',
              size: 2.2,
              density: Math.random() * 28 + 6,
              angle: startAngle,
              targetAngle: startAngle,
            })
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Render loop
    // ------------------------------------------------------------------
    function animate(): void {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() * 0.0007

      for (const p of particles) {
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const force = Math.max(0, (mouse.radius - dist) / mouse.radius)

        if (force > 0) {
          // Scatter away from cursor
          const pushX = (dx / dist) * force * p.density
          const pushY = (dy / dist) * force * p.density
          p.x -= pushX
          p.y -= pushY
          p.targetAngle = Math.atan2(-pushY, -pushX)
        } else {
          // Return to base position
          const rx = p.baseX - p.x
          const ry = p.baseY - p.y
          p.x += rx * 0.09
          p.y += ry * 0.09

          // Idle swimming: gentle angle oscillation per fish
          const idleAngle = Math.sin(t + p.baseX * 0.02) * 0.22
          p.targetAngle = idleAngle
        }

        // Smooth angle lerp
        p.angle = lerpAngle(p.angle, p.targetAngle, 0.1)

        drawFish(ctx, p)
      }

      rafId = requestAnimationFrame(animate)
    }

    // ------------------------------------------------------------------
    // Event listeners
    // ------------------------------------------------------------------
    const onMouseMove = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onMouseLeave = (): void => {
      mouse.x = -9999
      mouse.y = -9999
    }
    const onResize = (): void => {
      init()
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('resize', onResize)

    // Wait for fonts before rasterising
    document.fonts.ready.then(init).catch(init)
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-label="PESCADORA"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
