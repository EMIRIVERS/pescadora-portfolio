'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ProjectStatus, ProjectWithClient } from '@/lib/supabase/types'
import { StatusChanger } from '@/components/admin/projects/StatusChanger'
import { PROJECT_STATUS_STYLES } from '@/lib/status-colors'
import { formatBudget } from '@/lib/format'

// formatBudget / formatBudgetCompact now live in '@/lib/format' so Server
// Components can import them without crossing the client boundary. This module
// re-imports formatBudget locally for the table cell renderer.

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            'var(--dash-bg)',
  surface1:      'var(--dash-surface-1)',
  surface2:      'var(--dash-surface-2)',
  surface3:      'var(--dash-surface-3)',
  border:        'var(--dash-border)',
  borderSubtle:  'var(--dash-border)',
  borderHeader:  'var(--dash-border)',
  textPrimary:   'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary:  'var(--dash-text-tertiary)',
  accent:        'var(--dash-accent)',
  font:          "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ProjectStatus }) {
  const { label, color, bg } = PROJECT_STATUS_STYLES[status] ?? {
    label: status,
    color: 'var(--dash-text-secondary)',
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

/** Short format: "15 ene" (no year) */
export function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day:   'numeric',
    month: 'short',
  })
}

/** Long format: "15 ene. 2026" */
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
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-danger)', fontFamily: T.font }}>
        Vencido
      </span>
    )
  }

  let color = 'var(--dash-success)'
  if (diffDays < 7)  color = 'var(--dash-danger)'
  else if (diffDays < 14) color = 'var(--dash-warning)'

  return (
    <span style={{ fontSize: '12px', fontWeight: 600, color, fontFamily: T.font }}>
      {diffDays}d
    </span>
  )
}

// ── Table columns ─────────────────────────────────────────────────────────────

// Proyecto | Cliente | Presupuesto | Estado | Inicio | Entrega | Dias rest. | ->
const TABLE_COLS = 'grid-cols-[minmax(160px,1fr)_140px_120px_160px_90px_90px_80px_36px]'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProjectsTableProps {
  rows: ProjectWithClient[]
  pageSize?: number
}

// ── Row component ─────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  idx,
  isLast,
}: {
  project: ProjectWithClient
  idx: number
  isLast: boolean
}) {
  const router = useRouter()

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const endDate = project.end_date ? new Date(project.end_date) : null
  if (endDate) endDate.setHours(0, 0, 0, 0)
  const endIsOverdue =
    endDate != null &&
    endDate.getTime() < now.getTime() &&
    project.status !== 'delivered'

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>) {
    // Don't navigate if the click was on an interactive element inside the row
    const target = e.target as HTMLElement
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('select')
    ) {
      return
    }
    router.push(`/admin/projects/${project.id}`)
  }

  return (
    <motion.div
      key={project.id}
      className={`proj-row grid ${TABLE_COLS} gap-4 items-center`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.25, delay: Math.min(idx, 8) * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={handleRowClick}
      style={{
        padding: '16px 20px',
        borderBottom: !isLast ? `1px solid ${T.borderSubtle}` : undefined,
        cursor: 'pointer',
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

      {/* Budget */}
      <p
        style={{
          fontSize: '12px',
          color: project.budget != null ? T.textSecondary : T.textTertiary,
          margin: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {formatBudget(project.budget, project.currency)}
      </p>

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
        {formatDateShort(project.start_date)}
      </p>

      {/* End date — red if overdue and not delivered */}
      <p
        style={{
          fontSize: '12px',
          color: endIsOverdue ? 'var(--dash-danger)' : T.textSecondary,
          fontWeight: endIsOverdue ? 600 : 400,
          margin: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {formatDateShort(project.end_date)}
      </p>

      {/* Days remaining */}
      <div>
        {project.status === 'delivered' ? (
          <span style={{ fontSize: '12px', color: T.textTertiary, fontFamily: T.font }}>—</span>
        ) : (
          <DaysRemaining endDate={project.end_date} />
        )}
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
  )
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
        overflowX: 'auto',
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
        {['Proyecto', 'Cliente', 'Presupuesto', 'Estado', 'Inicio', 'Entrega', 'Días rest.', ''].map(
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
          <ProjectRow
            key={project.id}
            project={project}
            idx={idx}
            isLast={idx === paginatedRows.length - 1}
          />
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
              background: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              color: 'var(--dash-text-primary)',
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
              color: 'var(--dash-text-secondary)',
              fontFamily: T.font,
            }}
          >
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              color: 'var(--dash-text-primary)',
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
