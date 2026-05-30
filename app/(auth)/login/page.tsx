'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Timecode ────────────────────────────────────────────────────────────────

function useTimecode() {
  const [tc, setTc] = useState('00:00:00:00')
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const totalFrames = Math.floor(elapsed / (1000 / 24))
      const frames = totalFrames % 24
      const secs   = Math.floor(elapsed / 1000) % 60
      const mins   = Math.floor(elapsed / 60000) % 60
      const hrs    = Math.floor(elapsed / 3600000)
      setTc(
        `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(frames).padStart(2,'0')}`
      )
    }, 1000 / 24)
    return () => clearInterval(id)
  }, [])
  return tc
}

// ── Canvas background ───────────────────────────────────────────────────────

function FilmBg() {
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

    function draw() {
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, w, h)

      // Slow breathing vignette
      const pulse = Math.sin(t * 0.002) * 0.5 + 0.5
      const vig = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, h*0.85)
      vig.addColorStop(0,   'rgba(0,0,0,0)')
      vig.addColorStop(0.6, `rgba(0,0,0,${0.3 + pulse * 0.08})`)
      vig.addColorStop(1,   `rgba(0,0,0,${0.75 + pulse * 0.05})`)
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      // Warm accent glow — top right
      const warmGrad = ctx.createRadialGradient(w, 0, 0, w, 0, w * 0.6)
      warmGrad.addColorStop(0,   `rgba(232,52,26,${0.04 + pulse * 0.015})`)
      warmGrad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = warmGrad
      ctx.fillRect(0, 0, w, h)

      // Horizontal scan line
      const lineY = ((t * 0.3) % (h + 60)) - 30
      const lineGrad = ctx.createLinearGradient(0, lineY - 60, 0, lineY + 60)
      lineGrad.addColorStop(0,   'rgba(255,255,255,0)')
      lineGrad.addColorStop(0.5, 'rgba(255,255,255,0.018)')
      lineGrad.addColorStop(1,   'rgba(255,255,255,0)')
      ctx.fillStyle = lineGrad
      ctx.fillRect(0, lineY - 60, w, 120)

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
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  )
}

// ── Login form ──────────────────────────────────────────────────────────────

function LoginPageInner() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, setPending]   = useState(false)
  const [mounted, setMounted]   = useState(false)
  const timecode                = useTimecode()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
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
          : authError.message,
      )
      setPending(false)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  const GS = "var(--font-geist-sans), system-ui, sans-serif"
  const GM = "var(--font-geist-mono), ui-monospace, monospace"

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#050505',
      }}
    >
      <style>{`
        @keyframes lp-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-title-in {
          from { opacity: 0; transform: translateY(40px) scaleY(1.04); }
          to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        @keyframes lp-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        .lp-title   { animation: lp-title-in 1.1s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .lp-form    { animation: lp-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .lp-meta    { animation: lp-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
        .lp-rec-dot { animation: lp-blink 1.8s ease-in-out infinite; }

        .lp-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 10px 0;
          color: #F5F5F7;
          font-size: 15px;
          font-family: ${GS};
          outline: none;
          transition: border-color 0.25s;
          box-sizing: border-box;
          caret-color: #e8341a;
        }
        .lp-input::placeholder { color: rgba(255,255,255,0.18); }
        .lp-input:focus { border-bottom-color: rgba(232,52,26,0.6); }
        .lp-input:disabled { opacity: 0.4; cursor: not-allowed; }

        .lp-btn {
          width: 100%;
          padding: 14px;
          background: #e8341a;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          font-family: ${GS};
          letter-spacing: 0.16em;
          text-transform: uppercase;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }
        .lp-btn:hover:not(:disabled) { background: #ff3d1f; }
        .lp-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .lp-grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.04;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          animation: grain 0.5s steps(1) infinite;
        }
        @keyframes grain {
          0%,100%{background-position:0 0}
          20%{background-position:-30px 15px}
          40%{background-position:15px -20px}
          60%{background-position:-20px 10px}
          80%{background-position:10px -15px}
        }

        /* Letterbox bars */
        .lp-bar-top, .lp-bar-bottom {
          position: fixed;
          left: 0; right: 0;
          height: clamp(28px, 5vh, 48px);
          background: #000;
          z-index: 10;
          pointer-events: none;
        }
        .lp-bar-top    { top: 0; }
        .lp-bar-bottom { bottom: 0; }

        /* Corner brackets — viewfinder */
        .lp-bracket {
          position: absolute;
          width: 18px; height: 18px;
          pointer-events: none;
        }
        .lp-bracket::before, .lp-bracket::after {
          content: '';
          position: absolute;
          background: rgba(255,255,255,0.25);
        }
        .lp-bracket-tl { top: -1px; left: -1px; }
        .lp-bracket-tl::before { top: 0; left: 0; width: 100%; height: 1px; }
        .lp-bracket-tl::after  { top: 0; left: 0; width: 1px; height: 100%; }

        .lp-bracket-tr { top: -1px; right: -1px; }
        .lp-bracket-tr::before { top: 0; right: 0; width: 100%; height: 1px; }
        .lp-bracket-tr::after  { top: 0; right: 0; width: 1px; height: 100%; }

        .lp-bracket-bl { bottom: -1px; left: -1px; }
        .lp-bracket-bl::before { bottom: 0; left: 0; width: 100%; height: 1px; }
        .lp-bracket-bl::after  { bottom: 0; left: 0; width: 1px; height: 100%; }

        .lp-bracket-br { bottom: -1px; right: -1px; }
        .lp-bracket-br::before { bottom: 0; right: 0; width: 100%; height: 1px; }
        .lp-bracket-br::after  { bottom: 0; right: 0; width: 1px; height: 100%; }
      `}</style>

      {/* Background */}
      <FilmBg />
      <div className="lp-grain" />

      {/* Letterbox */}
      <div className="lp-bar-top" />
      <div className="lp-bar-bottom" />

      {/* REC indicator — top left inside bar */}
      {mounted && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          height: 'clamp(28px, 5vh, 48px)',
          display: 'flex', alignItems: 'center',
          gap: 6, paddingLeft: 20, zIndex: 20,
        }}>
          <span
            className="lp-rec-dot"
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8341a', display: 'block', flexShrink: 0 }}
          />
          <span style={{ fontFamily: GM, fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>
            REC
          </span>
        </div>
      )}

      {/* Timecode — top right inside bar */}
      {mounted && (
        <div style={{
          position: 'fixed', top: 0, right: 0,
          height: 'clamp(28px, 5vh, 48px)',
          display: 'flex', alignItems: 'center',
          paddingRight: 20, zIndex: 20,
        }}>
          <span style={{ fontFamily: GM, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
            {timecode}
          </span>
        </div>
      )}

      {/* Ratio indicator — bottom left */}
      {mounted && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0,
          height: 'clamp(28px, 5vh, 48px)',
          display: 'flex', alignItems: 'center',
          paddingLeft: 20, zIndex: 20,
        }}>
          <span style={{ fontFamily: GM, fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>
            2.39:1
          </span>
        </div>
      )}

      {/* Film label — bottom right */}
      {mounted && (
        <div style={{
          position: 'fixed', bottom: 0, right: 0,
          height: 'clamp(28px, 5vh, 48px)',
          display: 'flex', alignItems: 'center',
          paddingRight: 20, zIndex: 20,
        }}>
          <span style={{ fontFamily: GM, fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>
            XICO FILMS © 2025
          </span>
        </div>
      )}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, padding: '0 32px', textAlign: 'center' }}>

        {/* Giant XICO */}
        {mounted && (
          <div className="lp-title">
            <h1
              style={{
                fontFamily: GS,
                fontWeight: 900,
                fontSize: 'clamp(5.5rem, 24vw, 10rem)',
                letterSpacing: '-0.03em',
                lineHeight: 0.88,
                textTransform: 'uppercase',
                color: '#F5F5F7',
                margin: '0 0 4px',
              }}
            >
              XICO
            </h1>
            <p
              style={{
                fontFamily: GS,
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.55em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.25)',
                margin: '0 0 0 0.55em',
              }}
            >
              FILMS
            </p>
          </div>
        )}

        {/* Divider line */}
        {mounted && (
          <div style={{
            width: 1, height: 48,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)',
            margin: '28px auto',
          }} />
        )}

        {/* Form card with viewfinder brackets */}
        {mounted && (
          <div className="lp-form" style={{ position: 'relative', padding: '28px 2px 2px' }}>
            {/* Corner brackets */}
            <div className="lp-bracket lp-bracket-tl" />
            <div className="lp-bracket lp-bracket-tr" />
            <div className="lp-bracket lp-bracket-bl" />
            <div className="lp-bracket lp-bracket-br" />

            <form onSubmit={handleSubmit} noValidate style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Email */}
              <div>
                <label htmlFor="email" style={{
                  display: 'block', fontFamily: GM, fontSize: 9,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)', marginBottom: 8,
                }}>
                  Email
                </label>
                <input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={pending} className="lp-input" placeholder="correo@ejemplo.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{
                  display: 'block', fontFamily: GM, fontSize: 9,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)', marginBottom: 8,
                }}>
                  Contraseña
                </label>
                <input
                  id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={pending} className="lp-input" placeholder="••••••••"
                />
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontFamily: GM, fontSize: 11, color: '#e8341a', margin: 0, lineHeight: 1.4 }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button type="submit" disabled={pending} className="lp-btn">
                {pending ? 'Verificando...' : 'Acceder'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        {mounted && (
          <div className="lp-meta">
            <p style={{
              marginTop: 28, fontFamily: GM, fontSize: 9,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.1)',
            }}>
              Acceso privado &mdash; Solo equipo
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
