'use client'

import Link from 'next/link'
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

function statusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_STYLES[status]?.label ?? status
}

function statusStyle(status: ProjectStatus): { color: string; backgroundColor: string; border: string } {
  const s = PROJECT_STATUS_STYLES[status] ?? {
    color: '#86868B',
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
  const sStyle = client.most_recent_project_status !== null
    ? statusStyle(client.most_recent_project_status)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="client-card"
      style={{
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'default',
        fontFamily: SF,
      }}
    >
      {/* Top: avatar + name + company */}
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
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#F5F5F7',
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
                color: '#86868B',
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
        <span style={{ fontSize: '13px', color: '#2C2C2E' }}>Sin email</span>
      )}

      {/* Metadata row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '6px',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: '#48484A' }}>
          Desde {formatDate(client.created_at)}
        </span>
        <span style={{ fontSize: '12px', color: '#2C2C2E' }}>·</span>
        <span
          style={{
            fontSize: '12px',
            color: client.project_count > 0 ? '#86868B' : '#48484A',
          }}
        >
          {client.project_count} proyecto{client.project_count !== 1 ? 's' : ''}
        </span>
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
              color: '#FF9F0A',
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
              color: '#30D158',
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
              color: '#48484A',
              backgroundColor: 'rgba(72,72,74,0.1)',
              border: '1px solid rgba(72,72,74,0.2)',
            }}
          >
            Sin acceso
          </span>
        )}
      </div>

      {/* Footer links */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Link
          href={`/admin/clients/${client.id}`}
          className="client-detail-link"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Ver detalle
        </Link>
        <Link
          href={`/admin/projects?client=${client.id}`}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#0071E3',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Ver proyectos
        </Link>
      </div>
    </motion.div>
  )
}
