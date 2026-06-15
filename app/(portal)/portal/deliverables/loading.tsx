const SHIMMER_KEYFRAME = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`

const SHIMMER: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(237,232,224,0.04) 25%, rgba(237,232,224,0.09) 50%, rgba(237,232,224,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite linear',
  borderRadius: '4px',
}

export default function DeliverablesLoading() {
  return (
    <>
      <style>{SHIMMER_KEYFRAME}</style>
      <main className="portal-page" aria-hidden="true">
        <div
          className="mx-auto px-5 sm:px-6"
          style={{ maxWidth: 920, paddingTop: 'clamp(2.5rem, 5vw, 4rem)', paddingBottom: '6rem' }}
        >
          {/* Back link */}
          <div style={{ ...SHIMMER, width: 110, height: 11, marginBottom: '2.2rem' }} />

          {/* Masthead */}
          <div style={{ ...SHIMMER, width: 140, height: 11, marginBottom: '1.1rem' }} />
          <div style={{ ...SHIMMER, width: 280, height: 44, borderRadius: 6, marginBottom: '1.2rem' }} />
          <div style={{ ...SHIMMER, width: 320, height: 14, marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }} />

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 'clamp(2rem, 4vw, 2.75rem)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ ...SHIMMER, width: 72, height: 28, borderRadius: 999 }} />
            ))}
          </div>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.4rem' }}>
            <div style={{ ...SHIMMER, width: 160, height: 24, borderRadius: 6 }} />
            <div style={{ flex: 1, height: 1, background: 'rgba(237,232,224,0.10)' }} />
          </div>

          {/* Deliverable cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(237,232,224,0.025)',
                  border: '1px solid rgba(237,232,224,0.10)',
                  borderRadius: 6,
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ ...SHIMMER, width: 200, height: 22, borderRadius: 4 }} />
                  <div style={{ ...SHIMMER, width: 90, height: 12, borderRadius: 4 }} />
                </div>
                <div style={{ ...SHIMMER, width: 240, height: 12, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
