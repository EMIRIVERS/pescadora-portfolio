'use client'

interface Lead {
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  email: string | null
  phone: string | null
  company: string | null
  budget_range: string | null
  project_type: string | null
  last_contacted_at: string | null
}

interface ScoreItem {
  label: string
  points: number
  met: boolean
}

function computeScore(lead: Lead): { score: number; items: ScoreItem[] } {
  const items: ScoreItem[] = [
    { label: 'Tiene email', points: 15, met: Boolean(lead.email) },
    { label: 'Tiene teléfono', points: 15, met: Boolean(lead.phone) },
    { label: 'Tiene empresa', points: 10, met: Boolean(lead.company) },
    { label: 'Rango de presupuesto', points: 20, met: Boolean(lead.budget_range) },
    { label: 'Tipo de proyecto', points: 20, met: Boolean(lead.project_type) },
    { label: 'Contactado recientemente', points: 20, met: Boolean(lead.last_contacted_at) },
  ]

  const statusBonus: Record<Lead['status'], number> = {
    new: 0,
    contacted: 5,
    qualified: 10,
    proposal: 15,
    won: 20,
    lost: 0,
  }

  const base = items.reduce((sum, item) => (item.met ? sum + item.points : sum), 0)
  const bonus = statusBonus[lead.status] ?? 0
  const score = Math.min(100, base + bonus)

  return { score, items }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--dash-success)'
  if (score >= 50) return 'var(--dash-warning)'
  return 'var(--dash-danger)'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Alto'
  if (score >= 50) return 'Medio'
  return 'Bajo'
}

interface Props {
  lead: Lead
}

export default function LeadScoreBadge({ lead }: Props) {
  const { score } = computeScore(lead)
  const color = scoreColor(score)

  return (
    <span
      style={{
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        padding: '4px 10px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
      }}
    >
      Score {score} — {scoreLabel(score)}
    </span>
  )
}

export function LeadScoreBreakdown({ lead }: Props) {
  const { score, items } = computeScore(lead)
  const color = scoreColor(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: 'var(--dash-surface-3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${score}%`,
              height: '100%',
              background: color,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color,
            minWidth: 32,
            textAlign: 'right',
          }}
        >
          {score}
        </span>
      </div>

      {/* Breakdown items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: item.met ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)',
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: item.met ? 'var(--dash-success)' : 'var(--dash-text-tertiary)',
              }}
            >
              {item.met ? `+${item.points}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
