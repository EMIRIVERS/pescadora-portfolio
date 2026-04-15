interface Props {
  counts: {
    new: number
    contacted: number
    qualified: number
    proposal: number
    won: number
    lost: number
  }
  total: number
}

const STATS = [
  { key: 'new',       label: 'Nuevo',      color: '#3b82f6' },
  { key: 'contacted', label: 'Contactado', color: '#8b5cf6' },
  { key: 'qualified', label: 'Calificado', color: '#f59e0b' },
  { key: 'proposal',  label: 'Propuesta',  color: '#e8341a' },
  { key: 'won',       label: 'Ganado',     color: '#10b981' },
  { key: 'lost',      label: 'Perdido',    color: '#6b7280' },
] as const

export default function LeadsStats({ counts, total }: Props) {
  const conversionRate =
    counts.won + counts.lost > 0
      ? Math.round((counts.won / (counts.won + counts.lost)) * 100)
      : 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '2rem' }}>
        {STATS.map(({ key, label, color }) => {
          const count = counts[key]
          const pct = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <div
              key={key}
              style={{
                flex: 1,
                background: '#0d0d0d',
                border: '1px solid #1a1a1a',
                borderTop: `2px solid ${color}`,
                padding: '1rem',
                borderRadius: 2,
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#555',
                  marginBottom: '0.5rem',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '1.75rem',
                  color: '#e8e8e8',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.55rem',
                  color: '#333',
                  marginTop: '0.25rem',
                }}
              >
                {pct}% del total
              </p>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#555',
          }}
        >
          Tasa de conversion
        </span>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '1rem',
            color: conversionRate >= 50 ? '#10b981' : '#e8341a',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {conversionRate}%
        </span>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.55rem',
            color: '#333',
          }}
        >
          ({counts.won} ganados / {counts.won + counts.lost} cerrados)
        </span>
      </div>
    </div>
  )
}
