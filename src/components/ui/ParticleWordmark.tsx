'use client'
import { useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FishParticle {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  density: number
  angle: number
  targetAngle: number
  alpha: number
}

type CanvasPhase = 'idle' | 'converging' | 'bigfish' | 'static' | 'done'

export interface ParticleWordmarkProps {
  /** Fish color — default crema for dark bg */
  color?: string
  /** Canvas background color */
  background?: string
  /** Set true to begin exit animation sequence */
  triggerExit?: boolean
  /** Called when TV static finishes and screen is fully covered */
  onExitComplete?: () => void
}

// ---------------------------------------------------------------------------
// Draw helpers
// ---------------------------------------------------------------------------
function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color

  // Body — less elongated (1.55 : 0.75 ratio instead of 2.2 : 0.8)
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 1.55, size * 0.75, 0, 0, Math.PI * 2)
  ctx.fill()

  // Tail — proportionally smaller
  ctx.beginPath()
  ctx.moveTo(-size * 1.3, 0)
  ctx.lineTo(-size * 2.4, -size * 0.82)
  ctx.lineTo(-size * 2.4, size * 0.82)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * t
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ParticleWordmark({
  color = '#f2ede6',
  background = '#080808',
  triggerExit = false,
  onExitComplete,
}: ParticleWordmarkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<CanvasPhase>('idle')
  const phaseStartRef = useRef(0)
  const onExitCompleteRef = useRef(onExitComplete)
  const triggerRef = useRef(triggerExit)

  // Keep callback ref fresh
  useEffect(() => { onExitCompleteRef.current = onExitComplete }, [onExitComplete])

  // Detect triggerExit rising edge
  useEffect(() => {
    if (triggerExit && !triggerRef.current && phaseRef.current === 'idle') {
      phaseRef.current = 'converging'
      phaseStartRef.current = performance.now()
    }
    triggerRef.current = triggerExit
  }, [triggerExit])

  const startCanvas = useCallback(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctx2d = canvasEl.getContext('2d')
    if (!ctx2d) return

    const canvas = canvasEl
    const ctx = ctx2d
    const mouse = { x: -9999, y: -9999, radius: 130 }
    let particles: FishParticle[] = []
    let rafId = 0
    let bigFishSize = 0

    // ---------------------------------------------------------------
    // Init — rasterise PESCADORA into fish positions
    // ---------------------------------------------------------------
    function init(): void {
      const w = canvas.offsetWidth || window.innerWidth
      const h = canvas.offsetHeight || window.innerHeight
      canvas.width = w
      canvas.height = h
      particles = []
      bigFishSize = 0
      phaseRef.current = 'idle'

      ctx.clearRect(0, 0, w, h)
      const fontSize = Math.max(40, Math.min(w / 5.5, 130))

      ctx.font = `200 ${fontSize}px Geist, "Helvetica Neue", Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        `${fontSize * 0.28}px`

      ctx.fillStyle = color
      ctx.fillText('PESCADORA', w / 2, h / 2)

      const imageData = ctx.getImageData(0, 0, w, h)
      ctx.clearRect(0, 0, w, h)

      const gap = 5
      for (let y = 0; y < imageData.height; y += gap) {
        for (let x = 0; x < imageData.width; x += gap) {
          const alpha = imageData.data[(y * imageData.width + x) * 4 + 3]
          if (alpha > 128) {
            const a0 = (Math.random() - 0.5) * 0.5
            particles.push({
              x, y, baseX: x, baseY: y,
              size: 2.2,
              density: Math.random() * 28 + 6,
              angle: a0, targetAngle: a0,
              alpha: 1,
            })
          }
        }
      }
    }

    // ---------------------------------------------------------------
    // TV static — random gray blocks, shrink over progress
    // ---------------------------------------------------------------
    function drawStatic(progress: number): void {
      const w = canvas.width
      const h = canvas.height
      const blockSize = Math.max(1, Math.round(10 - progress * 9))
      for (let y = 0; y < h; y += blockSize) {
        for (let x = 0; x < w; x += blockSize) {
          const v = Math.random() * 200
          ctx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`
          ctx.fillRect(x, y, blockSize, blockSize)
        }
      }
    }

    // ---------------------------------------------------------------
    // Render loop
    // ---------------------------------------------------------------
    function animate(now: number): void {
      const phase = phaseRef.current
      const elapsed = now - phaseStartRef.current
      const cx = canvas.width / 2
      const cy = canvas.height / 2

      ctx.fillStyle = background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // ---- IDLE ----
      if (phase === 'idle') {
        const t = now * 0.0007
        for (const p of particles) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const force = Math.max(0, (mouse.radius - dist) / mouse.radius)

          if (force > 0) {
            p.x -= (dx / dist) * force * p.density
            p.y -= (dy / dist) * force * p.density
            p.targetAngle = Math.atan2(-dy, -dx)
          } else {
            p.x += (p.baseX - p.x) * 0.09
            p.y += (p.baseY - p.y) * 0.09
            p.targetAngle = Math.sin(t + p.baseX * 0.02) * 0.22
          }
          p.angle = lerpAngle(p.angle, p.targetAngle, 0.1)
          drawFish(ctx, p.x, p.y, p.size, p.angle, color, 1)
        }

      // ---- CONVERGING ----
      } else if (phase === 'converging') {
        const progress = Math.min(elapsed / 900, 1)
        for (const p of particles) {
          p.baseX += (cx - p.baseX) * 0.05
          p.baseY += (cy - p.baseY) * 0.05
          p.x += (p.baseX - p.x) * 0.12
          p.y += (p.baseY - p.y) * 0.12
          p.targetAngle = Math.atan2(cy - p.y, cx - p.x)
          p.angle = lerpAngle(p.angle, p.targetAngle, 0.15)
          p.alpha = Math.max(0, 1 - progress * 1.6)
          drawFish(ctx, p.x, p.y, p.size, p.angle, color, p.alpha)
        }
        if (progress >= 1) {
          phaseRef.current = 'bigfish'
          phaseStartRef.current = now
          bigFishSize = 8
        }

      // ---- BIG FISH — swims toward the camera ----
      } else if (phase === 'bigfish') {
        const progress = Math.min(elapsed / 900, 1)
        const eased = 1 - Math.pow(1 - progress, 2.5) // ease-in
        const maxSize = Math.max(canvas.width, canvas.height) * 0.65
        bigFishSize = 8 + eased * maxSize
        const swimAngle = Math.sin(now * 0.003) * 0.07
        drawFish(ctx, cx, cy, bigFishSize, swimAngle, color, 1)

        if (progress >= 1) {
          phaseRef.current = 'static'
          phaseStartRef.current = now
        }

      // ---- TV STATIC ----
      } else if (phase === 'static') {
        const progress = Math.min(elapsed / 520, 1)
        drawStatic(progress)
        if (progress >= 1) {
          phaseRef.current = 'done'
          onExitCompleteRef.current?.()
        }

      // ---- DONE — hold black ----
      } else {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      rafId = requestAnimationFrame(animate)
    }

    // ---------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------
    const onMouseMove = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onMouseLeave = (): void => { mouse.x = -9999; mouse.y = -9999 }
    const onResize = (): void => { init() }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('resize', onResize)

    document.fonts.ready.then(init).catch(init)
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [color, background])

  useEffect(() => {
    return startCanvas()
  }, [startCanvas])

  return (
    <canvas
      ref={canvasRef}
      aria-label="PESCADORA"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
