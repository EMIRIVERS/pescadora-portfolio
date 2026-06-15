import { SkeletonRow, SkeletonCard } from '@/components/admin/ui/Skeleton'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

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
        background: 'var(--dash-bg)',
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
              background: 'linear-gradient(90deg,var(--dash-surface-2) 25%,var(--dash-surface-3) 50%,var(--dash-surface-2) 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite linear',
            }}
          />
          <div
            style={{
              width: '90px',
              height: '13px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg,var(--dash-surface-2) 25%,var(--dash-surface-3) 50%,var(--dash-surface-2) 75%)',
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
            background: 'linear-gradient(90deg,var(--dash-surface-2) 25%,var(--dash-surface-3) 50%,var(--dash-surface-2) 75%)',
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
          background: 'linear-gradient(90deg,var(--dash-surface-2) 25%,var(--dash-surface-3) 50%,var(--dash-surface-2) 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite linear',
        }}
        aria-hidden="true"
      />

      {/* Table skeleton */}
      <div
        style={{
          background: 'var(--dash-surface-1)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        aria-label="Cargando proyectos..."
      >
        {/* Table header bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--dash-border)',
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
                background: 'var(--dash-surface-3)',
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
