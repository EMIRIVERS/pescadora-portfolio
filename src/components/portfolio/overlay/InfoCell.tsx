/** Labelled metadata cell used in the video/photo detail views. */
export function InfoCell({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.55rem', textTransform: 'uppercase', color: '#6b6560', letterSpacing: '0.15em', display: 'block', marginBottom: '0.3rem' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 600, fontSize: '0.85rem', color: '#ede8e0', letterSpacing: '0.05em' }}>
        {value}
      </span>
    </div>
  )
}
