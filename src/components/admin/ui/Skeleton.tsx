// ── Skeleton loader — shimmer animation ───────────────────────────────────────

const SHIMMER_CSS = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #1C1C1E 25%,
    #2C2C2E 50%,
    #1C1C1E 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite linear;
}
`

// ── Base Skeleton ─────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  className,
}: SkeletonProps) {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div
        className={`skeleton-shimmer${className ? ` ${className}` : ''}`}
        style={{
          width,
          height,
          borderRadius,
          display: 'block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
    </>
  )
}

// ── SkeletonCard — mimics stat cards in projects/clients ──────────────────────

export function SkeletonCard() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div
        style={{
          background: 'var(--dash-surface-1)',
          border: '1px solid var(--dash-border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
        aria-hidden="true"
      >
        {/* label line */}
        <div
          className="skeleton-shimmer"
          style={{ width: '60%', height: '10px', borderRadius: '4px' }}
        />
        {/* value */}
        <div
          className="skeleton-shimmer"
          style={{ width: '40%', height: '28px', borderRadius: '6px' }}
        />
        {/* subtitle */}
        <div
          className="skeleton-shimmer"
          style={{ width: '80%', height: '10px', borderRadius: '4px' }}
        />
        {/* badge row */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <div
            className="skeleton-shimmer"
            style={{ width: '70px', height: '20px', borderRadius: '20px' }}
          />
          <div
            className="skeleton-shimmer"
            style={{ width: '80px', height: '20px', borderRadius: '20px' }}
          />
        </div>
      </div>
    </>
  )
}

// ── SkeletonRow — mimics a table row in the projects list ─────────────────────

export function SkeletonRow() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 160px 160px 110px 110px 80px 36px',
          gap: '16px',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--dash-surface-2)',
        }}
        aria-hidden="true"
      >
        {/* Project title + desc */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            className="skeleton-shimmer"
            style={{ width: '55%', height: '14px', borderRadius: '4px' }}
          />
          <div
            className="skeleton-shimmer"
            style={{ width: '80%', height: '11px', borderRadius: '4px' }}
          />
        </div>
        {/* Client */}
        <div
          className="skeleton-shimmer"
          style={{ width: '70%', height: '13px', borderRadius: '4px' }}
        />
        {/* Status pill */}
        <div
          className="skeleton-shimmer"
          style={{ width: '100px', height: '22px', borderRadius: '20px' }}
        />
        {/* Start date */}
        <div
          className="skeleton-shimmer"
          style={{ width: '80px', height: '12px', borderRadius: '4px' }}
        />
        {/* End date */}
        <div
          className="skeleton-shimmer"
          style={{ width: '80px', height: '12px', borderRadius: '4px' }}
        />
        {/* Days remaining */}
        <div
          className="skeleton-shimmer"
          style={{ width: '32px', height: '14px', borderRadius: '4px' }}
        />
        {/* Arrow */}
        <div
          className="skeleton-shimmer"
          style={{ width: '28px', height: '28px', borderRadius: '8px' }}
        />
      </div>
    </>
  )
}

// ── SkeletonKanbanCard — mimics a lead card in the pipeline board ──────────────

export function SkeletonKanbanCard() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div
        style={{
          background: 'var(--dash-surface-2)',
          border: '1px solid var(--dash-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
        aria-hidden="true"
      >
        {/* Name */}
        <div
          className="skeleton-shimmer"
          style={{ width: '65%', height: '13px', borderRadius: '4px' }}
        />
        {/* Email */}
        <div
          className="skeleton-shimmer"
          style={{ width: '85%', height: '11px', borderRadius: '4px' }}
        />
        {/* Tag chip */}
        <div
          className="skeleton-shimmer"
          style={{ width: '50px', height: '18px', borderRadius: '20px' }}
        />
      </div>
    </>
  )
}
