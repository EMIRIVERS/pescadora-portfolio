'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { submitCotizacion } from '@/lib/actions/cotiza'

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type ActionState = { error?: string; success?: boolean } | null

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const PROJECT_TYPES = [
  'Videoclip',
  'Corporativo',
  'Restaurante / Bar',
  'Comercial',
  'Fotografía',
  'Otro',
] as const

const BUDGET_RANGES = [
  'Menos de $20,000 MXN',
  '$20,000 — $50,000 MXN',
  '$50,000 — $100,000 MXN',
  '$100,000+ MXN',
  'Por definir',
] as const

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function CotizaPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await submitCotizacion(prev, formData)
      if (result.success) {
        formRef.current?.reset()
      }
      return result
    },
    null,
  )

  // On a successful (or failed) submission the feedback message can land below
  // the fold on mobile, making users think nothing happened. Bring it into view.
  useEffect(() => {
    if (state?.success || state?.error) {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [state?.success, state?.error])

  return (
    <>
      {/* ── Inline styles (no Tailwind for the design-token classes) ─────────── */}
      <style>{`
        *,*::before,*::after { box-sizing: border-box; }

        .cq-body {
          min-height: 100dvh;
          background: #050505;
          color: #ede8e0;
          font-family: var(--font-geist-sans), -apple-system, system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          padding: 3rem 1.25rem 5rem;
        }

        /* grain */
        .cq-grain {
          pointer-events: none;
          position: fixed;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          z-index: 0;
        }

        .cq-wrap {
          position: relative;
          z-index: 1;
          max-width: 640px;
          margin: 0 auto;
        }

        /* wordmark */
        .cq-wordmark {
          display: block;
          font-size: 11px;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: #6b6560;
          text-decoration: none;
          margin-bottom: 3.5rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          transition: color 0.2s;
        }
        .cq-wordmark:hover { color: #8a857d; }

        /* heading */
        .cq-heading {
          font-family: var(--font-cormorant), "Cormorant Garamond", Georgia, serif;
          font-size: clamp(2.6rem, 8vw, 4.2rem);
          font-weight: 300;
          font-style: italic;
          line-height: 1.05;
          color: #ede8e0;
          margin: 0 0 0.85rem;
          letter-spacing: -0.01em;
        }

        .cq-sub {
          font-size: 0.9375rem;
          color: #8a857d;
          line-height: 1.5;
          margin: 0 0 3rem;
        }

        /* label */
        .cq-label {
          display: block;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8a857d;
          margin-bottom: 0.6rem;
          font-family: var(--font-geist-sans), -apple-system, system-ui, sans-serif;
        }

        /* input / textarea */
        .cq-input {
          width: 100%;
          background: #111111;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 6px;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          color: #ede8e0;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
          caret-color: #e8341a;
        }
        .cq-input::placeholder { color: #4a4640; }
        .cq-input:focus {
          border-color: #e8341a;
          box-shadow: 0 0 0 3px rgba(232,52,26,0.18);
        }
        .cq-input:focus-visible {
          outline: 2px solid #e8341a;
          outline-offset: 1px;
        }
        .cq-input:disabled { opacity: 0.45; cursor: not-allowed; }

        textarea.cq-input {
          min-height: 120px;
          resize: vertical;
          line-height: 1.55;
        }

        /* field group */
        .cq-field { margin-bottom: 1.5rem; }
        .cq-grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 480px) {
          .cq-grid2 { grid-template-columns: 1fr; }
        }

        /* pill radio group */
        .cq-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .cq-pill {
          position: relative;
          cursor: pointer;
        }
        .cq-pill input[type="radio"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        .cq-pill-label {
          display: inline-flex;
          align-items: center;
          padding: 0.45rem 0.9rem;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 3px;
          font-size: 0.8125rem;
          color: #8a857d;
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s, color 0.18s;
          user-select: none;
        }
        .cq-pill-label:hover {
          border-color: rgba(255,255,255,0.32);
          color: #ede8e0;
        }
        .cq-pill input[type="radio"]:checked + .cq-pill-label {
          border-color: #e8341a;
          background: rgba(232,52,26,0.12);
          color: #ede8e0;
        }
        .cq-pill input[type="radio"]:focus-visible + .cq-pill-label {
          outline: 2px solid #e8341a;
          outline-offset: 1px;
        }

        /* section divider */
        .cq-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 2rem 0;
        }

        /* submit */
        .cq-submit {
          width: 100%;
          padding: 0.85rem 1.5rem;
          background: #e8341a;
          color: #fff;
          border: none;
          border-radius: 2px;
          font-size: 0.9375rem;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s, opacity 0.18s;
          margin-top: 0.5rem;
          letter-spacing: 0.01em;
        }
        .cq-submit:hover:not(:disabled) { background: #ff3d1f; }
        .cq-submit:active:not(:disabled) { background: #c92a13; }
        .cq-submit:focus-visible {
          outline: 2px solid #e8341a;
          outline-offset: 2px;
        }
        .cq-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        /* feedback */
        .cq-success {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.9rem 1.1rem;
          border-radius: 6px;
          background: rgba(48,209,88,0.10);
          border: 1px solid rgba(48,209,88,0.28);
          color: #30d158;
          font-size: 0.875rem;
          margin-top: 1.25rem;
        }
        .cq-error {
          padding: 0.9rem 1.1rem;
          border-radius: 6px;
          background: rgba(232,52,26,0.08);
          border: 1px solid rgba(232,52,26,0.25);
          color: #e8341a;
          font-size: 0.875rem;
          margin-top: 1.25rem;
        }
      `}</style>

      <div className="cq-grain" aria-hidden="true" />

      <main className="cq-body">
        <div className="cq-wrap">

          {/* Wordmark */}
          <Link href="/" className="cq-wordmark">XICO Films</Link>

          {/* Header */}
          <h1 className="cq-heading">Cotiza tu proyecto.</h1>
          <p className="cq-sub">
            Cuéntanos qué quieres crear.&nbsp; Te contactamos en menos de 24 horas.
          </p>

          <form ref={formRef} action={action} noValidate>

            {/* Honeypot: oculto para humanos; si llega con valor, el server lo
                descarta en silencio. No usar display:none (algunos bots lo saltan). */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />

            {/* ── Tipo de produccion ─────────────────────────────────────────── */}
            <div className="cq-field">
              <span className="cq-label">Tipo de producción</span>
              <div className="cq-pills" role="group" aria-label="Tipo de producción">
                {PROJECT_TYPES.map((type) => (
                  <label key={type} className="cq-pill">
                    <input
                      type="radio"
                      name="project_type"
                      value={type}
                      disabled={pending}
                    />
                    <span className="cq-pill-label">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="cq-divider" />

            {/* ── Datos de contacto ─────────────────────────────────────────── */}
            <div className="cq-grid2">
              <div className="cq-field">
                <label htmlFor="name" className="cq-label">Nombre completo *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Tu nombre"
                  disabled={pending}
                  className="cq-input"
                />
              </div>

              <div className="cq-field">
                <label htmlFor="email" className="cq-label">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  disabled={pending}
                  className="cq-input"
                />
              </div>

              <div className="cq-field">
                <label htmlFor="phone" className="cq-label">Teléfono / WhatsApp</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+52 55 0000 0000"
                  disabled={pending}
                  className="cq-input"
                />
              </div>

              <div className="cq-field">
                <label htmlFor="company" className="cq-label">Empresa / Marca</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Tu empresa"
                  disabled={pending}
                  className="cq-input"
                />
              </div>
            </div>

            <hr className="cq-divider" />

            {/* ── Presupuesto ───────────────────────────────────────────────── */}
            <div className="cq-field">
              <span className="cq-label">Presupuesto estimado</span>
              <div className="cq-pills" role="group" aria-label="Presupuesto">
                {BUDGET_RANGES.map((range) => (
                  <label key={range} className="cq-pill">
                    <input
                      type="radio"
                      name="budget_range"
                      value={range}
                      disabled={pending}
                    />
                    <span className="cq-pill-label">{range}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="cq-divider" />

            {/* ── Mensaje ───────────────────────────────────────────────────── */}
            <div className="cq-field">
              <label htmlFor="message" className="cq-label">Cuéntanos más</label>
              <textarea
                id="message"
                name="message"
                placeholder="Cuéntanos más sobre tu proyecto, fechas, referencias..."
                disabled={pending}
                className="cq-input"
              />
            </div>

            {/* ── Submit ────────────────────────────────────────────────────── */}
            <button type="submit" disabled={pending} className="cq-submit">
              {pending ? 'Enviando...' : 'Enviar cotizaci\u00f3n \u2192'}
            </button>

            {/* ── Feedback ──────────────────────────────────────────────────── */}
            <div ref={feedbackRef}>
              {state?.success && (
                <div role="status" aria-live="polite" className="cq-success">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Recibido. Te contactamos pronto.</span>
                </div>
              )}

              {state?.error && (
                <div role="alert" aria-live="assertive" className="cq-error">
                  {state.error}
                </div>
              )}
            </div>

          </form>
        </div>
      </main>
    </>
  )
}
