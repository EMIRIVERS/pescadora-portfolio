'use client'

import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* --- Config --- */
const TOTAL_FRAMES = 233
const TOTAL_SETS = 12

/** Elige un set aleatorio en cada recarga */
function pickSet(): number {
  return Math.floor(Math.random() * TOTAL_SETS) + 1
}

function frameSrc(set: number, i: number): string {
  return `/hero-frames/set-${set}/frame_${String(i).padStart(4, '0')}.webp`
}

/* --- Slides narrativos --- */
type Align = 'start' | 'center' | 'end'

interface Slide {
  line1: string
  line2?: string
  /** scroll range normalizado [entrada, salida] dentro de 0-1 */
  range: [number, number]
  /** posicion horizontal */
  alignX: Align
  /** posicion vertical */
  alignY: Align
  /** text-align */
  textAlign: 'left' | 'center' | 'right'
}

const SLIDES: Slide[] = [
  {
    line1: 'CADA IMAGEN',
    line2: 'TIENE UNA HISTORIA',
    range: [0.04, 0.28],
    alignX: 'start',
    alignY: 'end',
    textAlign: 'left',
  },
  {
    line1: 'DIRECCION',
    line2: 'FOTOGRAFIA -- PRODUCCION',
    range: [0.32, 0.56],
    alignX: 'end',
    alignY: 'start',
    textAlign: 'right',
  },
  {
    line1: 'DEL CONCEPTO',
    line2: 'A LA PANTALLA',
    range: [0.60, 0.74],
    alignX: 'center',
    alignY: 'center',
    textAlign: 'center',
  },
]

/* --- Utilidades --- */

/** Divide un string en spans por caracter, preservando espacios */
function splitChars(text: string): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = []
  for (const char of text) {
    const span = document.createElement('span')
    span.textContent = char === ' ' ? '\u00A0' : char
    span.style.display = 'inline-block'
    span.style.willChange = 'transform, opacity, filter'
    spans.push(span)
  }
  return spans
}

/** Crea un contenedor de linea con overflow hidden (mask reveal) */
function createMaskedLine(): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.style.overflow = 'hidden'
  wrapper.style.position = 'relative'
  const inner = document.createElement('div')
  inner.style.display = 'flex'
  inner.style.justifyContent = 'center'
  inner.style.flexWrap = 'wrap'
  wrapper.appendChild(inner)
  return wrapper
}

interface HeroProps {
  onLoadProgress?: (progress: number) => void
  initialBlur?: boolean
}

export function Hero({ onLoadProgress, initialBlur }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const currentFrameRef = useRef(0)
  const slidesContainerRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const velocityRef = useRef(0)
  const skewTargetRef = useRef(0)
  const loadedCountRef = useRef(0)
  const stickyRef = useRef<HTMLDivElement>(null)

  /* --- Draw frame al canvas --- */
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    const img = imagesRef.current[index]
    if (!canvas || !img || !img.complete) return

    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { alpha: false })
    }
    const ctx = ctxRef.current
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      ctx.scale(dpr, dpr)
    }

    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const scale = Math.max(cw / iw, ch / ih)
    const sw = iw * scale
    const sh = ih * scale
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh)
  }, [])

  /* --- Carga progresiva de frames --- */
  useEffect(() => {
    const currentSet = pickSet()
    const imgs: HTMLImageElement[] = new Array(TOTAL_FRAMES)
    imagesRef.current = imgs

    const load = (i: number): Promise<void> => new Promise((res) => {
      const img = new Image()
      img.src = frameSrc(currentSet, i + 1)
      img.onload = () => {
        imgs[i] = img
        loadedCountRef.current++
        if (onLoadProgress) {
          onLoadProgress(loadedCountRef.current / TOTAL_FRAMES)
        }
        if (i === 0) drawFrame(0)
        res()
      }
      img.onerror = () => res()
    })

    async function preload() {
      // 1. Frame 1 inmediato (poster)
      await load(0)

      // 2. Keyframes cada 30
      const keyframes = []
      for (let i = 30; i < TOTAL_FRAMES; i += 30) keyframes.push(i)
      keyframes.push(TOTAL_FRAMES - 1) // ultimo frame
      await Promise.all(keyframes.map(load))

      // 3. Resto en batches de 15
      const remaining = []
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (!imgs[i]) remaining.push(i)
      }
      for (let b = 0; b < remaining.length; b += 15) {
        await Promise.all(remaining.slice(b, b + 15).map(load))
      }
    }

    preload()
  }, [drawFrame, onLoadProgress])

  /* --- Focus Pull effect (initial blur) --- */
  useEffect(() => {
    if (!initialBlur || !stickyRef.current) return

    const el = stickyRef.current
    gsap.set(el, { filter: 'blur(30px)', scale: 1.06 })

    const tween = gsap.to(el, {
      filter: 'blur(0px)',
      scale: 1,
      duration: 2,
      ease: 'power2.out',
      delay: 0.1,
    })

    return () => {
      tween.kill()
    }
  }, [initialBlur])

  /* --- Construir texto split por caracter + GSAP master timeline --- */
  useEffect(() => {
    const section = sectionRef.current
    const container = slidesContainerRef.current
    const logo = logoRef.current
    if (!section || !container || !logo) return

    // Limpiar
    container.innerHTML = ''

    // Almacenar refs de chars por slide para la timeline
    const slideCharSets: HTMLSpanElement[][] = []

    const justifyMap: Record<Align, string> = {
      start: 'flex-end',
      center: 'center',
      end: 'flex-start',
    }
    const alignMap: Record<Align, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
    }
    const lineJustifyMap: Record<string, string> = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end',
    }

    SLIDES.forEach((slide) => {
      const slideDiv = document.createElement('div')
      slideDiv.style.cssText = `
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: ${alignMap[slide.alignX]};
        justify-content: ${justifyMap[slide.alignY]};
        pointer-events: none; opacity: 0;
        transform-style: preserve-3d;
        will-change: transform, opacity;
        padding: clamp(3rem, 8vh, 6rem) clamp(2rem, 6vw, 5rem);
      `

      const allChars: HTMLSpanElement[] = []

      // Linea 1
      const line1 = createMaskedLine()
      const inner1 = line1.firstChild as HTMLDivElement
      inner1.style.justifyContent = lineJustifyMap[slide.textAlign]
      const chars1 = splitChars(slide.line1)
      chars1.forEach((s) => {
        s.style.fontFamily = 'var(--font-geist-sans)'
        s.style.fontWeight = '800'
        s.style.fontSize = 'clamp(2.2rem, 7vw, 6rem)'
        s.style.letterSpacing = '-0.02em'
        s.style.lineHeight = '1'
        s.style.color = '#ffffff'
        s.style.textTransform = 'uppercase'
        inner1.appendChild(s)
      })
      allChars.push(...chars1)
      slideDiv.appendChild(line1)

      // Linea 2
      if (slide.line2) {
        const line2 = createMaskedLine()
        const inner2 = line2.firstChild as HTMLDivElement
        inner2.style.justifyContent = lineJustifyMap[slide.textAlign]
        line2.style.marginTop = '0.3em'
        const chars2 = splitChars(slide.line2)
        chars2.forEach((s) => {
          s.style.fontFamily = 'var(--font-geist-sans)'
          s.style.fontWeight = '800'
          s.style.fontSize = 'clamp(1.4rem, 4.5vw, 3.8rem)'
          s.style.letterSpacing = '-0.01em'
          s.style.lineHeight = '1.1'
          s.style.color = 'rgba(255,255,255,0.6)'
          s.style.textTransform = 'uppercase'
          inner2.appendChild(s)
        })
        allChars.push(...chars2)
        slideDiv.appendChild(line2)
      }

      slideCharSets.push(allChars)
      container.appendChild(slideDiv)
    })

    /* --- Master Timeline --- */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress
          velocityRef.current = self.getVelocity()

          // Frame scrub -- busca el mas cercano cargado
          const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(p * TOTAL_FRAMES))
          if (targetFrame !== currentFrameRef.current) {
            currentFrameRef.current = targetFrame
            // Buscar frame cargado mas cercano
            let f = targetFrame
            while (f >= 0 && !imagesRef.current[f]) f--
            if (f >= 0) drawFrame(f)
          }
        },
      },
    })

    // Slides de texto
    const slideEls = container.children

    SLIDES.forEach((slide, i) => {
      const el = slideEls[i] as HTMLElement
      const chars = slideCharSets[i]
      const [start, end] = slide.range
      const dur = end - start
      const enterDur = dur * 0.25
      const holdDur = dur * 0.50
      const exitDur = dur * 0.25

      // ENTER -- slide aparece, chars se revelan con stagger + blur-to-sharp
      tl.fromTo(el,
        { opacity: 0 },
        { opacity: 1, duration: enterDur * 0.3, ease: 'none' },
        start,
      )
      tl.fromTo(chars,
        {
          y: 60,
          rotateX: -40,
          opacity: 0,
          filter: 'blur(8px)',
        },
        {
          y: 0,
          rotateX: 0,
          opacity: 1,
          filter: 'blur(0px)',
          stagger: 0.008,
          duration: enterDur,
          ease: 'power3.out',
        },
        start,
      )

      // HOLD (ya esta visible, no hace nada)

      // EXIT -- chars salen hacia la camara (escala grande + blur)
      tl.to(chars, {
        y: -40,
        scale: 1.15,
        opacity: 0,
        filter: 'blur(6px)',
        stagger: 0.005,
        duration: exitDur,
        ease: 'power2.in',
      }, start + enterDur + holdDur)
      tl.to(el,
        { opacity: 0, duration: exitDur * 0.5, ease: 'none' },
        start + enterDur + holdDur + exitDur * 0.5,
      )
    })

    // LOGO REVEAL -- crescendo final (diferente a los slides)
    const logoStart = 0.76
    const logoDur = 0.20

    // El logo entra con una escala masiva que se reduce (zoom-out reveal)
    tl.fromTo(logo,
      {
        opacity: 0,
        scale: 3,
        filter: 'blur(20px)',
      },
      {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: logoDur,
        ease: 'power4.out',
      },
      logoStart,
    )

    /* --- Velocity skew effect --- */
    const skewTicker = () => {
      const v = velocityRef.current
      skewTargetRef.current += (v * 0.0008 - skewTargetRef.current) * 0.12
      const skew = gsap.utils.clamp(-3, 3, skewTargetRef.current)
      if (container) {
        container.style.transform = `skewY(${skew}deg)`
      }
      velocityRef.current *= 0.95
    }
    gsap.ticker.add(skewTicker)

    /* --- Resize --- */
    const onResize = () => drawFrame(currentFrameRef.current)
    window.addEventListener('resize', onResize)

    return () => {
      tl.kill()
      gsap.ticker.remove(skewTicker)
      window.removeEventListener('resize', onResize)
    }
  }, [drawFrame])

  return (
    <section
      ref={sectionRef}
      id="hero"
      style={{ position: 'relative', height: '500vh' }}
    >
      <div
        ref={stickyRef}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          willChange: 'filter, transform',
        }}
      >

        {/* Canvas de frames */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}
        />

        {/* Vignette cinematografico */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* Scanlines (sutiles) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* --- Contenedor de slides de texto --- */}
        <div
          ref={slidesContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            pointerEvents: 'none',
            perspective: '800px',
            perspectiveOrigin: '50% 50%',
          }}
        />

        {/* --- Logo XICO FILMS -- crescendo --- */}
        <div
          ref={logoRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            pointerEvents: 'none',
            willChange: 'transform, opacity, filter',
          }}
        >
          <p style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 900,
            fontSize: 'clamp(5rem, 22vw, 18rem)',
            letterSpacing: '-0.03em',
            lineHeight: 0.85,
            textTransform: 'uppercase',
            color: '#ffffff',
            margin: 0,
          }}>
            XICO
          </p>

          <div style={{
            width: '100%',
            maxWidth: 'clamp(300px, 60vw, 900px)',
            height: '1px',
            background: 'rgba(255,255,255,0.12)',
            margin: '1.2rem 0',
          }} />

          <p style={{
            fontFamily: 'var(--font-geist-mono)',
            fontWeight: 400,
            fontSize: 'clamp(0.7rem, 2vw, 1.3rem)',
            letterSpacing: '0.6em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
            lineHeight: 1,
          }}>
            FILMS
          </p>
        </div>

        {/* Fade gradient inferior */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(to bottom, transparent 0%, #050505 100%)',
          pointerEvents: 'none',
          zIndex: 6,
        }} />

        {/* Scroll hint */}
        <div style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: 0,
          right: 0,
          zIndex: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.3,
          animation: 'heroScrollHint 2.2s ease-in-out infinite',
        }}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
            <path d="M6 0v16M1 11l5 5 5-5" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Skip hero button */}
        <button
          onClick={() => {
            document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })
          }}
          data-cursor="link"
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            right: '2rem',
            zIndex: 7,
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            transition: 'color 0.3s ease, border-color 0.3s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget
            btn.style.color = 'rgba(255,255,255,0.7)'
            btn.style.borderColor = 'rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget
            btn.style.color = 'rgba(255,255,255,0.3)'
            btn.style.borderColor = 'rgba(255,255,255,0.12)'
          }}
        >
          Saltar
        </button>

        <style>{`
          @keyframes heroScrollHint {
            0%, 100% { transform: translateY(0); opacity: 0.3; }
            50% { transform: translateY(6px); opacity: 0.55; }
          }
        `}</style>
      </div>
    </section>
  )
}
