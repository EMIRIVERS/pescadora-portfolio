'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Cinematic background canvas ────────────────────────────────────────────

function CinematicBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let t = 0

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Floating particles — ultra-slow, large, barely visible
    const PARTICLES = 28
    const particles = Array.from({ length: PARTICLES }, () => ({
      x:    Math.random() * window.innerWidth,
      y:    Math.random() * window.innerHeight,
      r:    Math.random() * 1.2 + 0.3,
      vx:   (Math.random() - 0.5) * 0.12,
      vy:   (Math.random() - 0.5) * 0.12,
      a:    Math.random() * 0.18 + 0.04,
    }))

    function draw() {
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height

      // Background
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, w, h)

      // Ambient radial glow — breathes slowly
      const pulse = Math.sin(t * 0.003) * 0.5 + 0.5
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.55)
      grad.addColorStop(0,   `rgba(0, 60, 130, ${0.055 + pulse * 0.025})`)
      grad.addColorStop(0.5, `rgba(0, 20, 50,  ${0.03  + pulse * 0.01})`)
      grad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Corner accent — top left, warm amber
      const cornerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.35)
      cornerGrad.addColorStop(0,   `rgba(180, 100, 0, ${0.022 + pulse * 0.008})`)
      cornerGrad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = cornerGrad
      ctx.fillRect(0, 0, w, h)

      // Floating particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.a * (0.5 + pulse * 0.5)})`
        ctx.fill()
      }

      // Horizontal scan line — very faint, slow drift
      const lineY = ((t * 0.04) % (h + 60)) - 30
      const lineGrad = ctx.createLinearGradient(0, lineY - 40, 0, lineY + 40)
      lineGrad.addColorStop(0,   'rgba(255,255,255,0)')
      lineGrad.addColorStop(0.5, 'rgba(255,255,255,0.025)')
      lineGrad.addColorStop(1,   'rgba(255,255,255,0)')
      ctx.fillStyle = lineGrad
      ctx.fillRect(0, lineY - 40, w, 80)

      t++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
      }}
    />
  )
}

// ── Login form ─────────────────────────────────────────────────────────────

function LoginPageInner() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, setPending]   = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    // Small delay to trigger entrance animation
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : authError.message
      )
      setPending(false)
      return
    }

    window.location.href = '/admin'
  }

  const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
  const CG = "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#050505',
      }}
    >
      <style>{`
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-enter { animation: lp-fade-up 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }
        .lp-enter-delay-1 { animation-delay: 0.05s; opacity: 0; }
        .lp-enter-delay-2 { animation-delay: 0.15s; opacity: 0; }
        .lp-enter-delay-3 { animation-delay: 0.25s; opacity: 0; }

        .lp-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 10px 0 10px;
          color: #F5F5F7;
          font-size: 15px;
          font-family: ${SF};
          outline: none;
          transition: border-color 0.25s;
          box-sizing: border-box;
          caret-color: #0071E3;
        }
        .lp-input::placeholder { color: rgba(255,255,255,0.2); }
        .lp-input:focus { border-bottom-color: rgba(0,113,227,0.7); }
        .lp-input:disabled { opacity: 0.4; cursor: not-allowed; }

        .lp-submit {
          width: 100%;
          padding: 14px;
          background: rgba(255,255,255,0.96);
          color: #050505;
          font-size: 12px;
          font-weight: 600;
          font-family: ${SF};
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }
        .lp-submit:hover:not(:disabled) { background: #ffffff; }
        .lp-submit:disabled { opacity: 0.35; cursor: not-allowed; }

        .lp-grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.035;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
        }

        .lp-divider {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent);
          margin: 0 auto 32px;
        }
      `}</style>

      {/* Animated background */}
      <CinematicBg />

      {/* Grain */}
      <div className="lp-grain" />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '380px',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        {/* Wordmark */}
        {mounted && (
          <div className="lp-enter lp-enter-delay-1">
            {/* Top line */}
            <div style={{
              width: '32px',
              height: '1px',
              background: 'rgba(255,255,255,0.2)',
              margin: '0 auto 28px',
            }} />

            {/* XICO */}
            <h1
              style={{
                fontFamily: CG,
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(4.5rem, 18vw, 7.5rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: '#F5F5F7',
                margin: '0 0 2px',
              }}
            >
              XICO
            </h1>

            {/* FILMS subtitle */}
            <p
              style={{
                fontFamily: SF,
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.38em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                margin: '0 0 0 0.38em', // offset the tracking
              }}
            >
              FILMS
            </p>

            {/* Divider */}
            <div className="lp-divider" style={{ marginTop: '28px' }} />
          </div>
        )}

        {/* Form card */}
        {mounted && (
          <div className="lp-enter lp-enter-delay-2">
            <form onSubmit={handleSubmit} noValidate style={{ textAlign: 'left' }}>
              {/* Email */}
              <div style={{ marginBottom: '28px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontFamily: SF,
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: '8px',
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  className="lp-input"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '36px' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontFamily: SF,
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: '8px',
                  }}
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className="lp-input"
                  placeholder="••••••••••"
                />
              </div>

              {/* Error */}
              {error && (
                <p
                  style={{
                    fontFamily: SF,
                    fontSize: '12px',
                    color: '#FF453A',
                    marginBottom: '20px',
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button type="submit" disabled={pending} className="lp-submit">
                {pending ? 'Verificando...' : 'Acceder'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        {mounted && (
          <div className="lp-enter lp-enter-delay-3">
            <p
              style={{
                marginTop: '36px',
                fontFamily: SF,
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.12)',
              }}
            >
              Acceso privado &mdash; Solo equipo
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
