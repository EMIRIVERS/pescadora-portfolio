type LeadSource = 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other'

interface Props {
  source: LeadSource
}

const SOURCE_CONFIG: Record<LeadSource, { label: string; color: string }> = {
  manual:    { label: 'Manual',    color: '#6b7280' },
  referral:  { label: 'Referido',  color: '#8b5cf6' },
  instagram: { label: 'Instagram', color: '#e8341a' },
  web:       { label: 'Web',       color: '#3b82f6' },
  whatsapp:  { label: 'WhatsApp',  color: '#10b981' },
  other:     { label: 'Otro',      color: '#6b7280' },
}

export default function LeadSourceBadge({ source }: Props) {
  const { label, color } = SOURCE_CONFIG[source]

  return (
    <span
      style={{
        fontSize: '0.6rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-geist-mono)',
        padding: '0.2rem 0.6rem',
        borderRadius: '2px',
        background: color + '20',
        color,
      }}
    >
      {label}
    </span>
  )
}
