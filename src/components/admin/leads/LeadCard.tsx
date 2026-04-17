'use client'

import { motion } from 'framer-motion'

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
  updated_at: string
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

// ── Priority ─────────────────────────────────────────────────────────────────

interface PriorityInfo {
  label: string
  color: string
  bg: string
}

const PRIORITY_MAP: Record<string, PriorityInfo> = {
  'PRIORIDAD 5': { label: 'P5', color: '#000000', bg: '#FFD60A' },
  'PRIORIDAD 4': { label: 'P4', color: '#000000', bg: '#FF9F0A' },
  'PRIORIDAD 3': { label: 'P3', color: '#ffffff', bg: '#86868B' },
  'PRIORIDAD 2': { label: 'P2', color: '#ffffff', bg: '#48484A' },
  'PRIORIDAD 1': { label: 'P1', color: '#ffffff', bg: '#3A3A3C' },
}

function parsePriority(notes: string | null): PriorityInfo | null {
  if (!notes) return null
  for (const key of Object.keys(PRIORITY_MAP)) {
    if (notes.includes(key)) return PRIORITY_MAP[key]
  }
  return null
}

// ── Rating ────────────────────────────────────────────────────────────────────

function parseRating(notes: string | null): number | null {
  if (!notes) return null
  const match = notes.match(/Rating:\s*(\d+(?:\.\d+)?)/)
  if (!match) return null
  const val = parseFloat(match[1])
  return isNaN(val) ? null : val
}

function ratingColor(rating: number): string {
  if (rating >= 4.8) return 'var(--dash-success)'
  if (rating >= 4.5) return 'var(--dash-warning)'
  return 'var(--dash-text-secondary)'
}

function ratingBgHex(rating: number): string {
  if (rating >= 4.8) return '#30D158'
  if (rating >= 4.5) return '#FF9F0A'
  return '#86868B'
}

// ── Staleness ─────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadCard({ lead, onClick, accentColor = 'var(--dash-text-secondary)' }: LeadCardProps) {
  const closingSoon   = lead.expected_close_date ? isClosingSoon(lead.expected_close_date) : false
  const sourceLabel   = SOURCE_LABELS[lead.source] ?? lead.source
  const priority      = parsePriority(lead.notes)
  const rating        = parseRating(lead.notes)
  const daysOld       = daysSince(lead.updated_at)
  const isStale       = daysOld > 7

  // Stale border overrides accentColor when > 7 days
  const leftBorderColor = isStale ? 'rgba(255,69,58,0.6)' : accentColor

  // Badge label for stale: >14 days -> "14d+", >7 days -> "7d+"
  const staleBadge: string | null = daysOld > 14 ? '14d+' : daysOld > 7 ? '7d+' : null

  // Days-in-stage badge (always shown)
  const daysInStageBadge = `${daysOld}d`

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{ borderRadius: '12px' }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'var(--dash-surface-2)',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
          transition: 'background 0.15s',
          borderLeft: `3px solid ${leftBorderColor}`,
          display: 'block',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-surface-3)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-surface-2)'
        }}
      >
        {/* Top row: name + priority badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '6px',
            marginBottom: '2px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '1 1 0',
              minWidth: 0,
            }}
          >
            {lead.name}
          </div>

          {priority && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: priority.color,
                backgroundColor: priority.bg,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.04em',
                lineHeight: 1.4,
                flexShrink: 0,
              }}
            >
              {priority.label}
            </span>
          )}
        </div>

        {/* Project type — italic line below name */}
        {lead.project_type && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--dash-text-secondary)',
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
              color: 'var(--dash-text-secondary)',
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
                color: 'var(--dash-text-tertiary)',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              @
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--dash-text-tertiary)',
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
                stroke="var(--dash-text-tertiary)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--dash-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {lead.phone}
            </span>
          </div>
        )}

        {/* Bottom row: source badge + rating + WA button + date info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          {/* Left: source badge + rating badge + converted badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {lead.source && (
              <span
                style={{
                  fontSize: '9px',
                  color: 'var(--dash-text-secondary)',
                  backgroundColor: 'var(--dash-border)',
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

            {/* Rating badge */}
            {rating !== null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: ratingColor(rating),
                  backgroundColor: `${ratingBgHex(rating)}1A`,
                  padding: '2px 5px',
                  borderRadius: '4px',
                }}
              >
                {/* Filled circle dot */}
                <svg
                  width="5"
                  height="5"
                  viewBox="0 0 5 5"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="2.5" cy="2.5" r="2.5" fill={ratingBgHex(rating)} />
                </svg>
                {rating.toFixed(1)}
              </span>
            )}

            {/* Converted badge */}
            {lead.converted_to_client_id && (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--dash-success)',
                  backgroundColor: 'rgba(48,209,88,0.12)',
                  padding: '2px 7px',
                  borderRadius: '6px',
                }}
              >
                Convertido
              </span>
            )}
          </div>

          {/* Right: date column + WA button */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
            {/* Date column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              {lead.expected_close_date && closingSoon && (
                <span style={{ fontSize: '11px', color: 'var(--dash-danger)' }}>
                  cierre {formatDate(lead.expected_close_date)}
                </span>
              )}

              {/* Date + days-in-stage + stale badge row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)' }}>
                  {formatDate(lead.created_at)}
                </span>

                {/* Days in stage */}
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--dash-text-tertiary)',
                    backgroundColor: 'var(--dash-border)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontWeight: 500,
                  }}
                >
                  {daysInStageBadge}
                </span>

                {/* Stale badge */}
                {staleBadge && (
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--dash-danger)',
                      backgroundColor: 'rgba(255,69,58,0.12)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontWeight: 700,
                    }}
                  >
                    {staleBadge}
                  </span>
                )}
              </div>
            </div>

            {/* WA quick button */}
            {lead.phone && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`https://wa.me/${lead.phone!.replace(/\D/g, '')}`, '_blank')
                }}
                title="Abrir en WhatsApp"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '5px',
                  background: 'rgba(37,211,102,0.15)',
                  color: '#25D366',
                  fontSize: '9px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                WA
              </button>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  )
}
