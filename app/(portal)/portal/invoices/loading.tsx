const SHIMMER_KEYFRAME = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`

const SHIMMER: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite linear',
  borderRadius: '6px',
}

export default function InvoicesLoading() {
  return (
    <>
      <style>{SHIMMER_KEYFRAME}</style>
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--portal-bg, #f9f9f9)',
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
        aria-hidden="true"
      >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div style={{ ...SHIMMER, width: 80, height: 13, marginBottom: '2rem' }} />
          <div style={{ ...SHIMMER, width: 140, height: 26, marginBottom: 8 }} />
          <div style={{ ...SHIMMER, width: 180, height: 13, borderRadius: 4, marginBottom: '2rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ ...SHIMMER, width: 120, height: 15 }} />
                  <div style={{ ...SHIMMER, width: 90, height: 22, borderRadius: 6 }} />
                </div>
                <div style={{ ...SHIMMER, width: 100, height: 12, borderRadius: 4 }} />
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ ...SHIMMER, width: 100, height: 22 }} />
                  <div style={{ ...SHIMMER, width: 80, height: 12, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
