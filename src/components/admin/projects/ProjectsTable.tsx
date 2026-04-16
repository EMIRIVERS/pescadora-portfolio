'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ProjectStatus, ProjectWithClient } from '@/lib/supabase/types'
import { StatusChanger } from '@/components/admin/projects/StatusChanger'
import { PROJECT_STATUS_STYLES } from '@/lib/status-colors'

// ── Budget formatting ──────────────────────────────────────────────────────────

export function formatBudget(
  budget: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (budget == null) return '—'
  const code = currency ?? 'MXN'
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(budget)
  } catch {
    return `$${budget.toLocaleString('es-MX')} ${code}`
  }
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            '#000000',
  surface1:      '#111111',
  surface2:      '#1C1C1E',
  surface3:      '#2C2C2E',
  border:        'rgba(255,255,255,0.08)',
  borderSubtle:  'rgba(255,255,255,0.04)',
  borderHeader:  'rgba(255,255,255,0.06)',
  textPrimary:   '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary:  '#48484A',
  accent:        '#0071E3',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ProjectStatus }) {
  const { label, color, bg } = PROJECT_STATUS_STYLES[status] ?? {
    label: status,
    color: '#86868B',
    bg: 'rgba(134,134,139,0.1)',
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color,
        fontFamily: T.font,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

// Suppress unused warning — StatusPill is exported for potential external use
export { StatusPill }

// ── Date formatting ───────────────────────────────────────────────────────────

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ── Days remaining ────────────────────────────────────────────────────────────

export function DaysRemaining({ endDate }: { endDate: string | null }) {
  if (!endDate) {
    return (
      <span style={{ fontSize: '12px', color: T.textTertiary, fontFamily: T.font }}>
        —
      </span>
    )
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#FF453A', fontFamily: T.font }}>
        Vencido
      </span>
    )
  }

  let color = '#30D158'
  if (diffDays < 7)  color = '#FF453A'
  else if (diffDays < 14) color = '#FF9F0A'

  return (
    <span style={{ fontSize: '12px', fontWeight: 600, color, fontFamily: T.font }}>
      {diffDays}d
    </span>
  )
}

// ── Table columns ─────────────────────────────────────────────────────────────

const TABLE_COLS = 'grid-cols-[1fr_160px_160px_110px_110px_100px_80px_36px]'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProjectsTableProps {
  rows: ProjectWithClient[]
  pageSize?: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectsTable({ rows, pageSize = 15 }: ProjectsTableProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(rows.length / pageSize)
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div
      style={{
        background: T.surface1,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Table header */}
      <div
        className={`grid ${TABLE_COLS} gap-4`}
        style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${T.borderHeader}`,
        }}
      >
        {['Proyecto', 'Cliente', 'Estado', 'Inicio', 'Entrega', 'Presupuesto', 'Dias rest.', ''].map(
          (col) => (
            <span
              key={col}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: T.textTertiary,
              }}
            >
              {col}
            </span>
          )
        )}
      </div>

      {/* Table rows */}
      <div>
        {paginatedRows.map((project, idx) => (
          <motion.div
            key={project.id}
            className={`proj-row grid ${TABLE_COLS} gap-4 items-center`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            style={{
              padding: '16px 20px',
              borderBottom:
                idx < paginatedRows.length - 1
                  ? `1px solid ${T.borderSubtle}`
                  : undefined,
              cursor: 'default',
            }}
          >
            {/* Title + description */}
            <div className="min-w-0">
              <Link
                href={`/admin/projects/${project.id}`}
                className="proj-title-link"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}
              >
                {project.title}
              </Link>
              {project.description && (
                <p
                  style={{
                    marginTop: '2px',
                    fontSize: '12px',
                    color: T.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: '2px 0 0',
                  }}
                >
                  {project.description}
                </p>
              )}
            </div>

            {/* Client */}
            <div className="min-w-0">
              {project.client ? (
                <p
                  style={{
                    fontSize: '13px',
                    color: T.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {project.client.name}
                </p>
              ) : (
                <span style={{ fontSize: '13px', color: T.textTertiary }}>—</span>
              )}
            </div>

            {/* Status */}
            <div>
              <StatusChanger projectId={project.id} currentStatus={project.status} />
            </div>

            {/* Start date */}
            <p
              style={{
                fontSize: '12px',
                color: T.textSecondary,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {formatDate(project.start_date)}
            </p>

            {/* End date */}
            <p
              style={{
                fontSize: '12px',
                color: T.textSecondary,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {formatDate(project.end_date)}
            </p>

            {/* Budget */}
            <p
              style={{
                fontSize: '12px',
                color: (project as unknown as { budget: number | null }).budget != null
                  ? T.textSecondary
                  : T.textTertiary,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {formatBudget(
                (project as unknown as { budget: number | null }).budget,
                (project as unknown as { currency: string | null }).currency,
              )}
            </p>

            {/* Days remaining */}
            <div>
              <DaysRemaining endDate={project.end_date} />
            </div>

            {/* Chevron link */}
            <Link
              href={`/admin/projects/${project.id}`}
              className="proj-arrow-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                textDecoration: 'none',
                flexShrink: 0,
              }}
              aria-label={`Ver proyecto ${project.title}`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 6h8M6 2l4 4-4 4" />
              </svg>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: `1px solid ${T.borderHeader}`,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: '#1C1C1E',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5F5F7',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontFamily: T.font,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.3 : 1,
            }}
          >
            &larr; Anterior
          </button>

          <span
            style={{
              fontSize: '12px',
              color: '#86868B',
              fontFamily: T.font,
            }}
          >
            Pagina {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: '#1C1C1E',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5F5F7',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontFamily: T.font,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.3 : 1,
            }}
          >
            Siguiente &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
