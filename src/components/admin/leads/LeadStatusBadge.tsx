import { LEAD_STATUS_STYLES } from '@/lib/status-colors'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

interface Props {
  status: LeadStatus
  size?: 'sm' | 'md'
}

export default function LeadStatusBadge({ status, size = 'md' }: Props) {
  const { label, color, bg } = LEAD_STATUS_STYLES[status] ?? {
    label: status,
    color: '#86868B',
    bg: 'rgba(134,134,139,0.1)',
  }

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        letterSpacing: '0.02em',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 20,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  )
}
