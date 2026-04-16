import { SkeletonRow, SkeletonCard } from '@/components/admin/ui/Skeleton'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const SHIMMER_KEYFRAME = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`

export default function ProjectsLoading() {
  return (
    <>
    <style>{SHIMMER_KEYFRAME}</style>
    <div
      style={{
        padding: '40px 32px',
        background: '#000000',
        minHeight: '100vh',
        fontFamily: FONT,
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '28px',
        }}
        aria-hidden="true"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              width: '160px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(90deg,#1C1C1E 25%,#2C2C2E 50%,#1C1C1E 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite linear',
            }}
          />
          <div
            style={{
              width: '90px',
              height: '13px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg,#1C1C1E 25%,#2C2C2E 50%,#1C1C1E 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite linear',
            }}
          />
        </div>
        <div
          style={{
            width: '140px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(90deg,#1C1C1E 25%,#2C2C2E 50%,#1C1C1E 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s infinite linear',
          }}
        />
      </div>

      {/* Stat cards skeleton */}
      <div
        style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}
        aria-hidden="true"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div
        style={{
          height: '40px',
          borderRadius: '10px',
          marginBottom: '20px',
          background: 'linear-gradient(90deg,#1C1C1E 25%,#2C2C2E 50%,#1C1C1E 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite linear',
        }}
        aria-hidden="true"
      />

      {/* Table skeleton */}
      <div
        style={{
          background: '#111111',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        aria-label="Cargando proyectos..."
      >
        {/* Table header bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'grid',
            gridTemplateColumns: '1fr 160px 160px 110px 110px 80px 36px',
            gap: '16px',
          }}
          aria-hidden="true"
        >
          {['55px', '80px', '90px', '60px', '60px', '50px', '20px'].map((w, i) => (
            <div
              key={i}
              style={{
                width: w,
                height: '10px',
                borderRadius: '3px',
                background: '#2C2C2E',
              }}
            />
          ))}
        </div>

        {/* 6 skeleton rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
    </>
  )
}
