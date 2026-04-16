type LeadSource = 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other'

interface Props {
  source: LeadSource
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  manual:    'Manual',
  referral:  'Referido',
  instagram: 'Instagram',
  web:       'Web',
  whatsapp:  'WhatsApp',
  other:     'Otro',
}

export default function LeadSourceBadge({ source }: Props) {
  const label = SOURCE_LABELS[source]

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        letterSpacing: '0.02em',
        padding: '3px 10px',
        borderRadius: 20,
        background: '#2C2C2E',
        color: '#86868B',
      }}
    >
      {label}
    </span>
  )
}
