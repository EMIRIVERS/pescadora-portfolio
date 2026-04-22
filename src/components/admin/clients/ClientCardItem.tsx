'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PROJECT_STATUS_STYLES } from '@/lib/status-colors'
import type { ProjectStatus } from '@/lib/supabase/types'
import type { Client } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientCard extends Client {
  project_count: number
  active_count: number
  delivered_count: number
  converted_lead_count: number
  most_recent_project_status: ProjectStatus | null
  lifetime_value: number
}

interface ClientCardItemProps {
  client: ClientCard
  color: string
  index: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatLifetimeValue(total: number): string | null {
  if (total === 0) return null
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M MXN`
  if (total >= 1_000) return `$${Math.round(total / 1_000)}k MXN`
  return `$${total.toLocaleString('es-MX')} MXN`
}

function statusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_STYLES[status]?.label ?? status
}

function statusStyle(status: ProjectStatus): { color: string; backgroundColor: string; border: string } {
  const s = PROJECT_STATUS_STYLES[status] ?? {
    color: 'var(--dash-text-secondary)',
    bg: 'rgba(134,134,139,0.1)',
    border: 'rgba(134,134,139,0.2)',
  }
  return {
    color: s.color,
    backgroundColor: s.bg,
    border: `1px solid ${s.border}`,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientCardItem({ client, color, index }: ClientCardItemProps) {
  const router = useRouter()
  const sStyle = client.most_recent_project_status !== null
    ? statusStyle(client.most_recent_project_status)
    : null

  const isActive = client.active_count > 0
  const lv = formatLifetimeValue(client.lifetime_value)

  function handleCardClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) return
    router.push(`/admin/clients/${client.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.04)' }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.06, ease: 'easeOut' }}
      className="client-card"
      onClick={handleCardClick}
      style={{
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer',
        fontFamily: SF,
      }}
    >
      {/* Top: avatar + name + company + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: `${color}22`,
            border: `1.5px solid ${color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color,
              letterSpacing: '-0.02em',
            }}
          >
            {initials(client.name)}
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {client.name}
          </p>
          {client.company && (
            <p
              style={{
                fontSize: '12px',
                color: 'var(--dash-text-secondary)',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {client.company}
            </p>
          )}
        </div>
        {/* Active/Inactive status badge */}
        <span
          style={{
            display: 'inline-block',
            padding: '3px 9px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            flexShrink: 0,
            color: isActive ? 'var(--dash-success)' : 'var(--dash-text-tertiary)',
            backgroundColor: isActive ? 'rgba(48,209,88,0.1)' : 'rgba(72,72,74,0.1)',
            border: isActive ? '1px solid rgba(48,209,88,0.25)' : '1px solid rgba(72,72,74,0.2)',
          }}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Email */}
      {client.email ? (
        <a
          href={`mailto:${client.email}`}
          className="client-email-link"
          style={{
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          {client.email}
        </a>
      ) : (
        <span style={{ fontSize: '13px', color: 'var(--dash-surface-3)' }}>Sin email</span>
      )}

      {/* Metadata row: date · projects · lifetime value */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '6px',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)' }}>
          Desde {formatDate(client.created_at)}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--dash-surface-3)' }}>·</span>
        <span
          style={{
            fontSize: '12px',
            color: client.project_count > 0 ? 'var(--dash-text-secondary)' : 'var(--dash-text-tertiary)',
          }}
        >
          {client.project_count} proyecto{client.project_count !== 1 ? 's' : ''}
        </span>
        {lv !== null && (
          <>
            <span style={{ fontSize: '12px', color: 'var(--dash-surface-3)' }}>·</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {lv}
            </span>
          </>
        )}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
        {client.most_recent_project_status !== null && sStyle !== null && (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.01em',
              ...sStyle,
            }}
          >
            {statusLabel(client.most_recent_project_status)}
          </span>
        )}

        {client.converted_lead_count > 0 && (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--dash-warning)',
              backgroundColor: 'rgba(255,159,10,0.1)',
              border: '1px solid rgba(255,159,10,0.2)',
            }}
          >
            Lead convertido
          </span>
        )}

        {client.profile_id !== null ? (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--dash-success)',
              backgroundColor: 'rgba(48,209,88,0.1)',
              border: '1px solid rgba(48,209,88,0.2)',
            }}
          >
            Tiene acceso
          </span>
        ) : (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--dash-text-tertiary)',
              backgroundColor: 'rgba(72,72,74,0.1)',
              border: '1px solid rgba(72,72,74,0.2)',
            }}
          >
            Sin acceso
          </span>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid var(--dash-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--dash-accent)',
            letterSpacing: '-0.01em',
          }}
        >
          Ver detalle &rarr;
        </span>
      </div>
    </motion.div>
  )
}
