import { SkeletonCard } from '@/components/admin/ui/Skeleton'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const SHIMMER_KEYFRAME = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`

const SHIMMER: React.CSSProperties = {
  background: 'linear-gradient(90deg,#1C1C1E 25%,#2C2C2E 50%,#1C1C1E 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite linear',
  borderRadius: '6px',
}

export default function ClientsLoading() {
  return (
    <>
    <style>{SHIMMER_KEYFRAME}</style>
    <div
      style={{
        padding: '40px 32px',
        minHeight: '100%',
        backgroundColor: '#000000',
        fontFamily: FONT,
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
        aria-hidden="true"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...SHIMMER, width: '120px', height: '28px' }} />
          <div style={{ ...SHIMMER, width: '160px', height: '13px', borderRadius: '4px' }} />
        </div>
        <div style={{ ...SHIMMER, width: '130px', height: '38px', borderRadius: '980px' }} />
      </div>

      {/* Stats row skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}
        aria-hidden="true"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ ...SHIMMER, width: '55%', height: '10px', borderRadius: '4px' }} />
            <div style={{ ...SHIMMER, width: '35%', height: '28px' }} />
          </div>
        ))}
      </div>

      {/* Search bar skeleton */}
      <div
        style={{ ...SHIMMER, height: '42px', borderRadius: '10px', marginBottom: '24px' }}
        aria-hidden="true"
      />

      {/* Client cards grid — 6 skeleton cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '12px',
        }}
        aria-label="Cargando clientes..."
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
    </>
  )
}
