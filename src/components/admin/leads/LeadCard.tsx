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

const SOURCE_COLORS: Record<string, string> = {
  instagram: '#e8341a',
  whatsapp: '#10b981',
  referral: '#8b5cf6',
  web: '#3b82f6',
  manual: '#6b7280',
  other: '#6b7280',
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

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  const sourceColor = SOURCE_COLORS[lead.source] ?? SOURCE_COLORS['other']
  const closingSoon =
    lead.expected_close_date ? isClosingSoon(lead.expected_close_date) : false

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm p-4 cursor-pointer hover:border-[#2a2a2a] hover:bg-[#111] transition-colors"
    >
      {/* Top row: name + source badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[#e8e8e8] text-sm font-mono font-medium leading-tight truncate">
          {lead.name}
        </span>
        <span
          className="shrink-0 text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{ color: sourceColor, backgroundColor: `${sourceColor}1a` }}
        >
          {lead.source}
        </span>
      </div>

      {/* Company row */}
      {lead.company && (
        <div className="mt-1">
          <span className="text-[#555] text-xs font-mono">{lead.company}</span>
        </div>
      )}

      {/* Contact row */}
      {(lead.email ?? lead.phone) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {lead.email ? (
            <>
              {/* envelope icon */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="3"
                  width="14"
                  height="10"
                  rx="1"
                  stroke="#555"
                  strokeWidth="1.5"
                />
                <path d="M1 4l7 5 7-5" stroke="#555" strokeWidth="1.5" />
              </svg>
              <span className="text-[#555] text-xs font-mono truncate">
                {lead.email}
              </span>
            </>
          ) : (
            <>
              {/* phone icon */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M3 1h3l1.5 4-2 1.5a9 9 0 004 4L11 9l4 1.5V14c0 1-4 2-8-2S1 5 2 4c0 0 0-3 1-3z"
                  stroke="#555"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[#555] text-xs font-mono truncate">
                {lead.phone}
              </span>
            </>
          )}
        </div>
      )}

      {/* Bottom row: tags + budget */}
      <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
        {lead.project_type && (
          <span className="text-[9px] font-mono tracking-[0.1em] uppercase px-2 py-0.5 bg-[#1a1a1a] text-[#555] rounded-sm">
            {lead.project_type}
          </span>
        )}
        {lead.budget_range && (
          <span className="text-[9px] font-mono text-[#444]">
            {lead.budget_range}
          </span>
        )}

        {/* Spacer pushes date/badge to right */}
        <span className="flex-1" />

        {lead.converted_to_client_id && (
          <span className="text-[9px] font-mono tracking-[0.1em] px-1.5 py-0.5 rounded-sm bg-[#10b98120] text-[#10b981]">
            + Convertido
          </span>
        )}

        {lead.expected_close_date && closingSoon && (
          <span className="text-[9px] font-mono text-[#e8341a]">
            {formatDate(lead.expected_close_date)}
          </span>
        )}
      </div>

      {/* Created date — subtle footer */}
      <div className="mt-2 text-[#333] text-[9px] font-mono">
        {formatDate(lead.created_at)}
      </div>
    </button>
  )
}
