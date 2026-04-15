'use client'

export function Hero() {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'transparent',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Scanlines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Film grain */}
      <div style={{
        position: 'absolute',
        inset: '-50%',
        width: '200%',
        height: '200%',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '180px 180px',
        opacity: 0.045,
        pointerEvents: 'none',
        zIndex: 2,
        animation: 'grain 0.8s steps(1) infinite',
      }} />

      {/* Wordmark */}
      <div style={{
        flex: 1,
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 1.5rem',
      }}>
        <p style={{
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 900,
          fontSize: 'clamp(5rem, 20vw, 16rem)',
          letterSpacing: '-0.02em',
          lineHeight: 0.9,
          textTransform: 'uppercase',
          color: '#ffffff',
          margin: 0,
        }}>
          CARAJO
        </p>

        {/* Divider */}
        <div style={{
          width: '100%',
          maxWidth: 'clamp(300px, 60vw, 900px)',
          height: '1px',
          background: 'rgba(255,255,255,0.1)',
          margin: '1.5rem 0',
        }} />

        <p style={{
          fontFamily: 'var(--font-geist-mono)',
          fontWeight: 400,
          fontSize: 'clamp(0.7rem, 2vw, 1.2rem)',
          letterSpacing: '0.6em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          margin: 0,
          lineHeight: 1,
        }}>
          FILMS
        </p>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute',
        bottom: '2.5rem',
        left: 0,
        right: 0,
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.35,
        animation: 'scrollHint 2.2s ease-in-out infinite',
      }}>
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <path d="M6 0v16M1 11l5 5 5-5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <style>{`
        @keyframes scrollHint {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(6px); opacity: 0.6; }
        }
        @keyframes grain {
          0%   { transform: translate(0, 0); }
          10%  { transform: translate(-2%, -3%); }
          20%  { transform: translate(3%, 2%); }
          30%  { transform: translate(-1%, 4%); }
          40%  { transform: translate(4%, -1%); }
          50%  { transform: translate(-3%, 3%); }
          60%  { transform: translate(2%, -4%); }
          70%  { transform: translate(-4%, 1%); }
          80%  { transform: translate(1%, -2%); }
          90%  { transform: translate(3%, 4%); }
          100% { transform: translate(-2%, 0); }
        }
      `}</style>
    </section>
  )
}
