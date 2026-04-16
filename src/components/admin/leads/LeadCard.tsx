'use client'

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  source: string
  notes: string | null
  budget_range: string | null
  project_type: string | null
  created_at: string
  last_contacted_at: string | null
  expected_close_date: string | null
  converted_to_client_id: string | null
}

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  accentColor?: string
}

const SOURCE_LABELS: Record<string, string> = {
  web:       'Web',
  referral:  'Referido',
  instagram: 'IG',
  whatsapp:  'WA',
  email:     'Email',
  phone:     'Telefono',
  manual:    'Manual',
  other:     'Otro',
}

function isClosingSoon(dateStr: string): boolean {
  const close = new Date(dateStr)
  const now = new Date()
  const diffMs = close.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays < 7
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    month: 'short',
    day: 'numeric',
  })
}

export default function LeadCard({ lead, onClick, accentColor = '#86868B' }: LeadCardProps) {
  const closingSoon = lead.expected_close_date ? isClosingSoon(lead.expected_close_date) : false
  const sourceLabel = SOURCE_LABELS[lead.source] ?? lead.source

  function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max) + '...' : str
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: '#1C1C1E',
        border: 'none',
        borderRadius: '12px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderLeft: `3px solid ${accentColor}`,
        display: 'block',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#2C2C2E'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#1C1C1E'
      }}
    >
      {/* Top row: name */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#F5F5F7',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '2px',
        }}
      >
        {lead.name}
      </div>

      {/* Project type — italic line below name */}
      {lead.project_type && (
        <div
          style={{
            fontSize: '11px',
            color: '#86868B',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '4px',
          }}
        >
          {lead.project_type}
        </div>
      )}

      {/* Company */}
      {lead.company && (
        <div
          style={{
            fontSize: '12px',
            color: '#86868B',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {lead.company}
        </div>
      )}

      {/* Email row */}
      {lead.email && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '4px',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: '11px',
              color: '#48484A',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            @
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#48484A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncate(lead.email, 20)}
          </span>
        </div>
      )}

      {/* Phone row — only shown when no email */}
      {!lead.email && lead.phone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '4px',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M3 1h3l1.5 4-2 1.5a9 9 0 004 4L11 9l4 1.5V14c0 1-4 2-8-2S1 5 2 4c0 0 0-3 1-3z"
              stroke="#48484A"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: '11px',
              color: '#48484A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lead.phone}
          </span>
        </div>
      )}

      {/* Bottom row: source badge + date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginTop: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Source badge — neutral style */}
          {lead.source && (
            <span
              style={{
                fontSize: '9px',
                color: '#86868B',
                backgroundColor: 'rgba(255,255,255,0.06)',
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                fontWeight: 500,
              }}
            >
              {sourceLabel}
            </span>
          )}

          {/* Converted badge */}
          {lead.converted_to_client_id && (
            <span
              style={{
                fontSize: '11px',
                color: '#30D158',
                backgroundColor: 'rgba(48,209,88,0.12)',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              Convertido
            </span>
          )}
        </div>

        {/* Date */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          {lead.expected_close_date && closingSoon && (
            <span style={{ fontSize: '11px', color: '#FF453A' }}>
              cierre {formatDate(lead.expected_close_date)}
            </span>
          )}
          <span style={{ fontSize: '11px', color: '#48484A' }}>
            {formatDate(lead.created_at)}
          </span>
        </div>
      </div>
    </button>
  )
}
