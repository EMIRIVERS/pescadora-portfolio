type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

interface Props {
  status: LeadStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new:       { label: 'Nuevo',      color: '#0071E3' },
  contacted: { label: 'Contactado', color: '#BF5AF2' },
  qualified: { label: 'Calificado', color: '#FF9F0A' },
  proposal:  { label: 'Propuesta',  color: '#FF453A' },
  won:       { label: 'Ganado',     color: '#30D158' },
  lost:      { label: 'Perdido',    color: '#636366' },
}

export default function LeadStatusBadge({ status, size = 'md' }: Props) {
  const { label, color } = STATUS_CONFIG[status]

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        letterSpacing: '0.02em',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 20,
        background: color + '26', // 0.15 opacity hex = 26
        color,
      }}
    >
      {label}
    </span>
  )
}
