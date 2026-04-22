const SHIMMER_KEYFRAME = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`

const SHIMMER: React.CSSProperties = {
  background: 'linear-gradient(90deg,var(--dash-surface-2) 25%,var(--dash-surface-3) 50%,var(--dash-surface-2) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite linear',
  borderRadius: '8px',
}

export default function DashboardLoading() {
  return (
    <>
      <style>{SHIMMER_KEYFRAME}</style>
      <div
        style={{
          padding: '28px 32px',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
        aria-hidden="true"
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...SHIMMER, width: 160, height: 28, marginBottom: 8 }} />
          <div style={{ ...SHIMMER, width: 120, height: 14, borderRadius: 4 }} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ ...SHIMMER, width: 36, height: 36, borderRadius: 10 }} />
              <div style={{ ...SHIMMER, width: '60%', height: 32 }} />
              <div style={{ ...SHIMMER, width: '80%', height: 11, borderRadius: 4 }} />
            </div>
          ))}
        </div>

        {/* Two list cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...SHIMMER, width: 100, height: 14 }} />
                <div style={{ ...SHIMMER, width: 60, height: 12, borderRadius: 4 }} />
              </div>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} style={{ padding: '12px 20px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ ...SHIMMER, width: 120, height: 13 }} />
                    <div style={{ ...SHIMMER, width: 80, height: 11, borderRadius: 4 }} />
                  </div>
                  <div style={{ ...SHIMMER, width: 60, height: 20, borderRadius: 20 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
