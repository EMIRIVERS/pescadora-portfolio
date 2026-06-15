const SHIMMER_KEYFRAME = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`

const SHIMMER: React.CSSProperties = {
  background:
    'linear-gradient(90deg, rgba(237,232,224,0.03) 25%, rgba(237,232,224,0.08) 50%, rgba(237,232,224,0.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite linear',
  borderRadius: '4px',
}

const SERIF = 'var(--font-cormorant), Georgia, serif'
const MONO = 'var(--font-geist-mono), monospace'

export default function InvoicesLoading() {
  return (
    <>
      <style>{SHIMMER_KEYFRAME}</style>
      <main className="portal-page" aria-hidden="true">
        <div
          className="mx-auto px-5 sm:px-6"
          style={{ maxWidth: 760, paddingTop: 'clamp(2.5rem, 5vw, 4rem)', paddingBottom: '6rem' }}
        >
          {/* Back link */}
          <div style={{ ...SHIMMER, width: 70, height: 12, marginBottom: '2.2rem' }} />

          {/* Masthead */}
          <div style={{ ...SHIMMER, width: 120, height: 12, marginBottom: '1.1rem' }} />
          <div style={{ ...SHIMMER, width: 'clamp(180px, 40vw, 320px)', height: 'clamp(2.3rem, 6vw, 3.8rem)', borderRadius: '6px', marginBottom: '1.2rem' }} />
          <div style={{ ...SHIMMER, width: '60%', maxWidth: 360, height: 14, marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }} />

          {/* Section label */}
          <div style={{ ...SHIMMER, width: 130, height: 12, marginBottom: '1.6rem', fontFamily: MONO }} />

          {/* Invoice card skeletons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--portal-surface)',
                  border: '1px solid var(--portal-border)',
                  borderRadius: 6,
                  padding: 'clamp(1.5rem, 3vw, 2rem)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.4rem' }}>
                  <div>
                    <div style={{ ...SHIMMER, width: 64, height: 10, marginBottom: '0.55rem' }} />
                    <div style={{ ...SHIMMER, width: 150, height: 'clamp(1.35rem, 2.6vw, 1.75rem)', fontFamily: SERIF }} />
                  </div>
                  <div style={{ ...SHIMMER, width: 110, height: 12 }} />
                </div>
                <div style={{ ...SHIMMER, width: 200, height: 11, marginBottom: '1.4rem' }} />
                <div style={{ borderTop: '1px solid var(--portal-border)', paddingTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ ...SHIMMER, width: 130, height: 'clamp(1.8rem, 4vw, 2.4rem)' }} />
                  <div style={{ ...SHIMMER, width: 140, height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
