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
  { key: 'new',       label: 'Nuevo',      color: '#0071E3' },
  { key: 'contacted', label: 'Contactado', color: '#BF5AF2' },
  { key: 'qualified', label: 'Calificado', color: '#FF9F0A' },
  { key: 'proposal',  label: 'Propuesta',  color: '#FF453A' },
  { key: 'won',       label: 'Ganado',     color: '#30D158' },
  { key: 'lost',      label: 'Perdido',    color: 'var(--dash-text-tertiary)' },
] as const

export default function LeadsStats({ counts, total }: Props) {
  const conversionRate =
    counts.won + counts.lost > 0
      ? Math.round((counts.won / (counts.won + counts.lost)) * 100)
      : 0

  return (
    <div>
      {/* Stat cards row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {STATS.map(({ key, label, color }) => {
          const count = counts[key]
          const pct = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <div
              key={key}
              style={{
                flex: 1,
                minWidth: 100,
                background: 'var(--dash-surface-1)',
                border: '1px solid var(--dash-border)',
                borderRadius: 12,
                padding: '16px 20px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--dash-text-secondary)',
                  margin: '0 0 10px 0',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color,
                  lineHeight: 1,
                  margin: '0 0 6px 0',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--dash-text-tertiary)',
                  margin: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pct}% del total
              </p>
            </div>
          )
        })}
      </div>

      {/* Conversion rate strip */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--dash-surface-2)',
          border: '1px solid var(--dash-border)',
          borderRadius: 12,
          padding: '10px 16px',
          marginBottom: '1.5rem',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--dash-text-secondary)',
          }}
        >
          Tasa de conversion
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: conversionRate >= 50 ? '#30D158' : '#FF453A',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {conversionRate}%
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--dash-text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ({counts.won} ganados / {counts.won + counts.lost} cerrados)
        </span>
      </div>
    </div>
  )
}
