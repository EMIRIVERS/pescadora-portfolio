'use client'
import { useRef, useEffect, useCallback } from 'react'

interface FishParticle {
  x: number; y: number
  baseX: number; baseY: number
  fishX: number; fishY: number
  size: number; density: number
  angle: number; targetAngle: number
  alpha: number
  rgbColor: number
  vx: number; vy: number
  distFromNose: number
  isExtra: boolean
}


export interface ParticleWordmarkProps {
  color?: string
  background?: string
}

// ---------------------------------------------------------------------------
// Draw helpers
// ---------------------------------------------------------------------------
function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, angle: number,
  color: string, alpha: number,
): void {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  // Chubby rounded body
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 1.8, size * 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
  // Short fat tail
  ctx.beginPath()
  ctx.moveTo(-size * 1.4, 0)
  ctx.lineTo(-size * 2.2, -size * 0.9)
  ctx.quadraticCurveTo(-size * 1.7, 0, -size * 2.2, size * 0.9)
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
}: ParticleWordmarkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCanvas = useCallback(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctx2d = canvasEl.getContext('2d')
    if (!ctx2d) return

    const canvas = canvasEl
    const ctx = ctx2d
    const mouse = { x: -9999, y: -9999, radius: 160 }
    let particles: FishParticle[] = []
    let fishNoseX = 0
    let rafId = 0

    // Offscreen canvas for solid text mask (easter egg: text hides particles)
    const textOC = document.createElement('canvas')
    const textOCCtx = textOC.getContext('2d')!
    let storedCarajoFont = ''
    let storedCarajoLS = ''
    let storedCarajoY = 0
    let storedFilmsFont = ''
    let storedFilmsLS = ''
    let storedFilmsY = 0

    // ---------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------
    function init(): void {
      const w = canvas.offsetWidth || window.innerWidth
      const h = canvas.offsetHeight || window.innerHeight
      canvas.width = w
      canvas.height = h
      textOC.width = w
      textOC.height = h
      particles = []

      // Rasterize CARAJO + FILMS text
      ctx.clearRect(0, 0, w, h)
      const fontSize = Math.max(50, Math.min(w / 4, 170))
      const filmsFontSize = Math.round(fontSize * 0.38)
      storedCarajoY = h * 0.40
      storedFilmsY = storedCarajoY + fontSize * 0.78
      storedCarajoFont = `700 ${fontSize}px Geist, "Helvetica Neue", Arial, sans-serif`
      storedCarajoLS = `${fontSize * 0.28}px`
      storedFilmsFont = `700 ${filmsFontSize}px Geist, "Helvetica Neue", Arial, sans-serif`
      storedFilmsLS = `${filmsFontSize * 0.5}px`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = color
      ctx.font = storedCarajoFont
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        storedCarajoLS
      ctx.fillText('CARAJO', w / 2, storedCarajoY)
      ctx.font = storedFilmsFont
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        storedFilmsLS
      ctx.fillText('FILMS', w / 2, storedFilmsY)
      const imageData = ctx.getImageData(0, 0, w, h)
      ctx.clearRect(0, 0, w, h)

      // Collect text sample points
      const textPts: { x: number; y: number }[] = []
      const textGap = 4
      for (let y = 0; y < imageData.height; y += textGap) {
        for (let x = 0; x < imageData.width; x += textGap) {
          if (imageData.data[(y * imageData.width + x) * 4 + 3] > 128) {
            textPts.push({ x, y })
          }
        }
      }

      // Create particles from text points
      fishNoseX = w * 0.75

      for (const pt of textPts) {
        const a0 = (Math.random() - 0.5) * 0.5
        particles.push({
          x: pt.x,
          y: pt.y,
          baseX: pt.x,
          baseY: pt.y,
          fishX: pt.x,
          fishY: pt.y,
          size: 2.4,
          density: Math.random() * 40 + 12,
          angle: a0,
          targetAngle: a0,
          alpha: 1,
          rgbColor: Math.floor(Math.random() * 3),
          vx: 0,
          vy: 0,
          distFromNose: Math.sqrt((pt.x - fishNoseX) ** 2 + (pt.y - h / 2) ** 2),
          isExtra: false,
        })
      }
    }

    // ---------------------------------------------------------------
    // Render loop
    // ---------------------------------------------------------------
    function animate(now: number): void {
      const cx = canvas.width / 2
      const w = canvas.width
      const h = canvas.height

      if (background === 'transparent' || background === 'rgba(0,0,0,0)') {
        ctx.clearRect(0, 0, w, h)
      } else {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, w, h)
      }

      const t = now * 0.0007

      // 1. Physics + draw particles revealed by mouse
      for (const p of particles) {
        if (p.isExtra) continue
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const force = dist > 0.5 ? Math.max(0, (mouse.radius - dist) / mouse.radius) : 0
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
        const baseDist = Math.sqrt((mouse.x - p.baseX) ** 2 + (mouse.y - p.baseY) ** 2)
        if (baseDist < mouse.radius * 1.2) {
          drawFish(ctx, p.x, p.y, p.size, p.angle, color, 1)
        }
      }

      // 2. Overlay solid text with a soft hole at mouse position
      textOCCtx.clearRect(0, 0, w, h)
      textOCCtx.globalCompositeOperation = 'source-over'
      textOCCtx.textAlign = 'center'
      textOCCtx.textBaseline = 'middle'
      textOCCtx.fillStyle = color
      textOCCtx.font = storedCarajoFont
      ;(textOCCtx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        storedCarajoLS
      textOCCtx.fillText('CARAJO', cx, storedCarajoY)
      textOCCtx.font = storedFilmsFont
      ;(textOCCtx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        storedFilmsLS
      textOCCtx.fillText('FILMS', cx, storedFilmsY)

      if (mouse.x > -100) {
        textOCCtx.globalCompositeOperation = 'destination-out'
        const grad = textOCCtx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, mouse.radius,
        )
        grad.addColorStop(0, 'rgba(0,0,0,1)')
        grad.addColorStop(0.7, 'rgba(0,0,0,1)')
        grad.addColorStop(0.92, 'rgba(0,0,0,0.4)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        textOCCtx.fillStyle = grad
        textOCCtx.fillRect(
          mouse.x - mouse.radius, mouse.y - mouse.radius,
          mouse.radius * 2, mouse.radius * 2,
        )
      }

      ctx.drawImage(textOC, 0, 0)
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

    // Wait for fonts, then initialize
    document.fonts.ready.then(() => {
      init()
    })
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
      aria-label="CARAJO FILMS"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
