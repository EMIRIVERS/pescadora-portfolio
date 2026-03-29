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

type CanvasPhase = 'idle' | 'converging' | 'bigfish' | 'done'

export interface ParticleWordmarkProps {
  color?: string
  background?: string
  triggerExit?: boolean
  onExitComplete?: () => void
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
// Fish silhouette — detailed bezier-curve profile with fins, eye, gill
// ---------------------------------------------------------------------------
interface FishSilhouetteResult {
  points: { x: number; y: number }[]
  noseX: number
}

function loadFishImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = '/fish_silhouette.png'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('fish image not found'))
  })
}

function sampleFishSilhouette(
  W: number, H: number, fishImg: HTMLImageElement | null,
): FishSilhouetteResult {
  const oc = document.createElement('canvas')
  oc.width = W
  oc.height = H
  const c = oc.getContext('2d')!
  const cx = W / 2
  const cy = H / 2

  if (fishImg) {
    // Draw the real fish silhouette, centered and scaled with padding to avoid edge artifacts
    const maxW = W * 0.55
    const maxH = H * 0.55
    const imgAspect = fishImg.naturalWidth / fishImg.naturalHeight
    let drawW: number
    let drawH: number
    if (maxW / maxH > imgAspect) {
      drawH = maxH
      drawW = drawH * imgAspect
    } else {
      drawW = maxW
      drawH = drawW / imgAspect
    }
    // Inset by 6px to crop JPEG edge artifacts
    const pad = 6
    c.drawImage(
      fishImg,
      pad, pad, fishImg.naturalWidth - pad * 2, fishImg.naturalHeight - pad * 2,
      cx - drawW / 2, cy - drawH / 2, drawW, drawH,
    )
  }

  // Sample points from brightness (JPEG — fish is light on dark)
  const data = c.getImageData(0, 0, W, H).data
  const pts: { x: number; y: number }[] = []
  const gap = 3
  let maxX = 0

  for (let yy = 0; yy < H; yy += gap) {
    for (let xx = 0; xx < W; xx += gap) {
      const idx = (yy * W + xx) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      if (brightness > 100) {
        pts.push({ x: xx, y: yy })
        if (xx > maxX) maxX = xx
      }
    }
  }

  return { points: pts, noseX: maxX > 0 ? maxX : cx + W * 0.25 }
}

// ---------------------------------------------------------------------------
// Fish cursor — draw a small fish at mouse position
// ---------------------------------------------------------------------------
function drawCursorFish(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, time: number, cursorColor: string,
): void {
  if (x < -100) return
  const s = 8
  const tailWag = Math.sin(time * 8) * 0.3
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.translate(x, y)
  ctx.rotate(Math.PI + tailWag * 0.15) // face left (swimming direction)
  ctx.fillStyle = cursorColor
  // Body
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 1.6, s * 0.9, 0, 0, Math.PI * 2)
  ctx.fill()
  // Tail with wag
  ctx.beginPath()
  ctx.moveTo(-s * 1.2, 0)
  ctx.lineTo(-s * 2.0, -s * 0.7 + tailWag * s * 0.5)
  ctx.quadraticCurveTo(-s * 1.5, tailWag * s * 0.3, -s * 2.0, s * 0.7 + tailWag * s * 0.5)
  ctx.closePath()
  ctx.fill()
  // Eye
  ctx.beginPath()
  ctx.arc(s * 0.5, -s * 0.15, s * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = '#080808'
  ctx.fill()
  ctx.restore()
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

  useEffect(() => { onExitCompleteRef.current = onExitComplete }, [onExitComplete])

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
    const mouse = { x: -9999, y: -9999, radius: 160 }
    let particles: FishParticle[] = []
    let fishNoseX = 0
    let rafId = 0
    let fishImg: HTMLImageElement | null = null

    // Offscreen canvas for solid text mask (easter egg: text hides particles)
    const textOC = document.createElement('canvas')
    const textOCCtx = textOC.getContext('2d')!
    let storedFont = ''
    let storedLetterSpacing = ''

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
      phaseRef.current = 'idle'

      // Rasterize PESCADORA text
      ctx.clearRect(0, 0, w, h)
      const fontSize = Math.max(40, Math.min(w / 5.5, 130))
      storedFont = `700 ${fontSize}px Geist, "Helvetica Neue", Arial, sans-serif`
      storedLetterSpacing = `${fontSize * 0.28}px`
      ctx.font = storedFont
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        storedLetterSpacing
      ctx.fillStyle = color
      ctx.fillText('PESCADORA', w / 2, h / 2)
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

      // Sample fish silhouette from real image
      const fishResult = sampleFishSilhouette(w, h, fishImg)
      const fishPts = fishResult.points
      fishNoseX = fishResult.noseX
      const halfH = h / 2

      // Create particles — enough to fully populate the fish shape
      const count = Math.max(textPts.length, fishPts.length)

      for (let i = 0; i < count; i++) {
        const textPt = i < textPts.length ? textPts[i] : null
        const fishPt = i < fishPts.length ? fishPts[i] : fishPts[i % fishPts.length]

        const bx = textPt ? textPt.x : Math.random() * w
        const by = textPt ? textPt.y : Math.random() * h
        const isExtra = !textPt

        const a0 = (Math.random() - 0.5) * 0.5
        particles.push({
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          fishX: fishPt.x,
          fishY: fishPt.y,
          size: 2.4,
          density: Math.random() * 40 + 12,
          angle: a0,
          targetAngle: a0,
          alpha: isExtra ? 0 : 1,
          rgbColor: Math.floor(Math.random() * 3),
          vx: 0,
          vy: 0,
          distFromNose: Math.sqrt(
            (fishPt.x - fishNoseX) ** 2 + (fishPt.y - halfH) ** 2,
          ),
          isExtra,
        })
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
      const w = canvas.width
      const h = canvas.height

      if (background === 'transparent' || background === 'rgba(0,0,0,0)') {
        ctx.clearRect(0, 0, w, h)
      } else {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, w, h)
      }

      // ---- IDLE — solid text with hidden fish particles (easter egg) ----
      if (phase === 'idle') {
        const t = now * 0.0007

        // 1. Physics + draw particles (only those near mouse or displaced)
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

          // Only draw if particle base is inside the mouse reveal zone
          const baseDist = Math.sqrt((mouse.x - p.baseX) ** 2 + (mouse.y - p.baseY) ** 2)
          if (baseDist < mouse.radius * 1.2) {
            drawFish(ctx, p.x, p.y, p.size, p.angle, color, 1)
          }
        }

        // 2. Overlay solid text with a soft hole where the mouse reveals particles
        textOCCtx.clearRect(0, 0, w, h)
        textOCCtx.globalCompositeOperation = 'source-over'
        textOCCtx.font = storedFont
        textOCCtx.textAlign = 'center'
        textOCCtx.textBaseline = 'middle'
        ;(textOCCtx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
          storedLetterSpacing
        textOCCtx.fillStyle = color
        textOCCtx.fillText('PESCADORA', cx, cy)

        // Cut a sharp hole at mouse position with thin feathered edge
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

      // ---- CONVERGING — anamorphic flip: text morphs into fish ----
      } else if (phase === 'converging') {
        const ROTATE_DUR = 1200
        const HOLD_DUR = 600
        const TOTAL_DUR = ROTATE_DUR + HOLD_DUR
        const clampedT = Math.min(elapsed, TOTAL_DUR)

        if (clampedT < ROTATE_DUR) {
          const progress = clampedT / ROTATE_DUR
          const rotAngle = progress * Math.PI
          const cosR = Math.cos(rotAngle)

          for (const p of particles) {
            let dispX: number
            let dispY: number
            let alpha: number

            if (cosR >= 0) {
              // First half — text squishes to center line
              dispX = cx + (p.baseX - cx) * cosR
              dispY = p.baseY
              p.targetAngle = Math.sin(now * 0.0007 + p.baseX * 0.02) * 0.22
              alpha = p.isExtra ? 0 : 1
            } else {
              // Second half — fish expands, extras materialize
              const negCos = -cosR
              dispX = cx + (p.fishX - cx) * negCos
              const yT = Math.min(1, (progress - 0.5) * 2)
              dispY = p.isExtra
                ? cy + (p.fishY - cy) * negCos
                : p.baseY + (p.fishY - p.baseY) * yT
              p.targetAngle = 0
              alpha = p.isExtra
                ? Math.min(1, (progress - 0.55) * 4)
                : 1
            }

            p.x = dispX
            p.y = dispY
            p.alpha = Math.max(0, alpha)
            p.angle = lerpAngle(p.angle, p.targetAngle, 0.1)
            if (p.alpha > 0.01) {
              drawFish(ctx, dispX, dispY, p.size, p.angle, color, p.alpha)
            }
          }
        } else {
          // HOLD — fish clearly visible with swimming undulation
          const swimT = now * 0.004

          for (const p of particles) {
            // Body wave: tail wiggles more, head stays stable
            const normX = (p.fishX - cx) / (w * 0.28)
            const waveAmp = 5 * Math.max(0.15, 1 - normX * 0.5)
            const wave = Math.sin(swimT - normX * 2.5) * waveAmp

            p.x = p.fishX
            p.y = p.fishY + wave
            p.alpha = 1
            p.angle = lerpAngle(p.angle, wave * 0.015, 0.08)
            drawFish(ctx, p.x, p.y, p.size, p.angle, color, 1)
          }
        }

        if (elapsed >= TOTAL_DUR) {
          phaseRef.current = 'bigfish'
          phaseStartRef.current = now
        }

      // ---- BIGFISH — fish turns to face down, then dives into the depth ----
      } else if (phase === 'bigfish') {
        const TURN_DUR = 700
        const DIVE_DUR = 1400
        const TOTAL = TURN_DUR + DIVE_DUR
        const swimT = now * 0.005

        if (elapsed < TURN_DUR) {
          // Fish rotates from horizontal to facing downward (nose-first dive)
          const turnT = elapsed / TURN_DUR
          const eased = turnT * turnT * (3 - 2 * turnT) // smoothstep
          const angle = eased * Math.PI / 2
          const cosA = Math.cos(angle)
          const sinA = Math.sin(angle)

          for (const p of particles) {
            // Rotate particle position around fish center
            const dx = p.fishX - cx
            const dy = p.fishY - cy
            const rx = cx + dx * cosA - dy * sinA
            const ry = cy + dx * sinA + dy * cosA

            // Swimming wave perpendicular to body axis
            const bodyProgress = (dx * cosA + dy * sinA) / (w * 0.25)
            const waveAmp = 6 * Math.max(0.15, 1 - bodyProgress * 0.4)
            const wave = Math.sin(swimT - bodyProgress * 2.5) * waveAmp
            const perpX = -sinA
            const perpY = cosA

            p.x = rx + perpX * wave
            p.y = ry + perpY * wave
            p.angle = lerpAngle(p.angle, angle + wave * 0.02, 0.12)
            drawFish(ctx, p.x, p.y, p.size, p.angle, color, 1)
          }
        } else {
          // Fish dives downward — shrinks and fades into the ocean
          const diveT = Math.min(1, (elapsed - TURN_DUR) / DIVE_DUR)
          const eased = diveT * diveT
          const scale = Math.max(0.02, 1 - eased * 0.95)
          const alpha = Math.max(0, 1 - eased * 1.15)
          const diveOffset = eased * h * 0.7

          // Fish is fully vertical (90° rotation)
          for (const p of particles) {
            const dx = p.fishX - cx
            const dy = p.fishY - cy
            // Rotated 90°: cos=0, sin=1
            const rx = cx - dy
            const ry = cy + dx

            // Scale around center + dive offset
            const sx = cx + (rx - cx) * scale
            const sy = cy + (ry - cy) * scale + diveOffset

            // Horizontal wave (perpendicular to vertical body)
            const bodyProgress = dx / (w * 0.25)
            const waveAmp = 5 * Math.max(0.15, 1 - Math.abs(bodyProgress) * 0.4) * (1 - eased)
            const wave = Math.sin(swimT - bodyProgress * 2.5) * waveAmp

            p.x = sx + wave
            p.y = sy
            p.angle = lerpAngle(p.angle, Math.PI / 2 + wave * 0.015, 0.08)
            drawFish(ctx, p.x, p.y, p.size * scale, p.angle, color, alpha)
          }

          if (diveT >= 1) {
            phaseRef.current = 'done'
            onExitCompleteRef.current?.()
          }
        }

      // ---- DONE ----
      } else {
        if (background === 'transparent' || background === 'rgba(0,0,0,0)') {
          ctx.clearRect(0, 0, w, h)
        } else {
          ctx.fillStyle = background
          ctx.fillRect(0, 0, w, h)
        }
      }

      // Fish cursor — always visible
      drawCursorFish(ctx, mouse.x, mouse.y, now * 0.001, color)

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

    // Load fish image + fonts, then initialize
    Promise.all([
      loadFishImage().catch(() => null),
      document.fonts.ready,
    ]).then(([img]) => {
      fishImg = img
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
      aria-label="PESCADORA"
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'none' }}
    />
  )
}
