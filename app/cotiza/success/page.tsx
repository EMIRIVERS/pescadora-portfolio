import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'

// Post-submit thank-you page: keep it out of the index and override the
// parent /cotiza canonical so it doesn't point elsewhere.
export const metadata: Metadata = {
  title: 'Mensaje recibido',
  robots: { index: false, follow: false },
  alternates: { canonical: '/cotiza/success' },
}

export default function CotizaSuccessPage() {
  return (
    <>
      <style>{`
        *,*::before,*::after { box-sizing: border-box; }
        .cs-body {
          min-height: 100dvh;
          background: #050505;
          color: #F5F5F7;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          text-align: center;
        }
        .cs-grain {
          pointer-events: none;
          position: fixed;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          z-index: 0;
        }
        .cs-card {
          position: relative;
          z-index: 1;
          max-width: 400px;
          width: 100%;
        }
        .cs-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(52,199,89,0.12);
          border: 1px solid rgba(52,199,89,0.28);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #34C759;
          margin-bottom: 1.75rem;
        }
        .cs-heading {
          font-family: var(--font-cormorant), "Cormorant Garamond", Georgia, serif;
          font-size: clamp(2rem, 6vw, 2.8rem);
          font-weight: 300;
          font-style: italic;
          line-height: 1.1;
          color: #F5F5F7;
          margin: 0 0 0.75rem;
        }
        .cs-sub {
          font-size: 0.9375rem;
          color: #86868B;
          line-height: 1.5;
          margin: 0 0 2.5rem;
        }
        .cs-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.875rem;
          color: #0071E3;
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: opacity 0.18s;
        }
        .cs-link:hover { opacity: 0.75; }
        .cs-wordmark {
          display: block;
          margin-top: 3rem;
          font-size: 11px;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: #3a3a3c;
          font-family: "SF Mono", "Geist Mono", monospace;
        }
      `}</style>

      <div className="cs-grain" aria-hidden="true" />

      <main className="cs-body">
        <div className="cs-card">
          <div className="cs-icon-wrap">
            <Check size={24} strokeWidth={2.5} aria-hidden="true" />
          </div>

          <h1 className="cs-heading">Mensaje recibido.</h1>
          <p className="cs-sub">
            Te contactamos en menos de 24 horas.
          </p>

          <Link href="/" className="cs-link">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Volver al inicio
          </Link>

          <span className="cs-wordmark">XICO Films</span>
        </div>
      </main>
    </>
  )
}
