type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

interface Props {
  status: LeadStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new:       { label: 'Nuevo',      color: '#3b82f6' },
  contacted: { label: 'Contactado', color: '#8b5cf6' },
  qualified: { label: 'Calificado', color: '#f59e0b' },
  proposal:  { label: 'Propuesta',  color: '#e8341a' },
  won:       { label: 'Ganado',     color: '#10b981' },
  lost:      { label: 'Perdido',    color: '#6b7280' },
}

export default function LeadStatusBadge({ status, size = 'md' }: Props) {
  const { label, color } = STATUS_CONFIG[status]

  return (
    <span
      style={{
        fontSize: size === 'sm' ? '0.55rem' : '0.6rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-geist-mono)',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.2rem 0.6rem',
        borderRadius: '2px',
        background: color + '20',
        color,
      }}
    >
      {label}
    </span>
  )
}
