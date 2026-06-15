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
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        letterSpacing: '0.02em',
        padding: '3px 10px',
        borderRadius: 20,
        background: 'var(--dash-surface-3)',
        color: 'var(--dash-text-secondary)',
      }}
    >
      {label}
    </span>
  )
}
