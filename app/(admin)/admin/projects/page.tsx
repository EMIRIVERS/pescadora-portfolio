import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus, ProjectWithClient, Client } from '@/lib/supabase/types'
import { ProjectsFilterBar } from '@/components/admin/projects/projects-filter-bar'
import { ProjectsTable, formatBudget, formatBudgetCompact } from '@/components/admin/projects/ProjectsTable'
import { PROJECT_STATUS_STYLES } from '@/lib/status-colors'
import { AnimatedEmptyState } from '@/components/admin/AnimatedEmptyState'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            'var(--dash-bg)',
  surface1:      'var(--dash-surface-1)',
  surface2:      'var(--dash-surface-2)',
  surface3:      'var(--dash-surface-3)',
  border:        'var(--dash-border)',
  borderSubtle:  'var(--dash-surface-2)',
  borderHeader:  'var(--dash-border)',
  textPrimary:   'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary:  'var(--dash-text-tertiary)',
  accent:        '#0071E3',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ── Stats row config ──────────────────────────────────────────────────────────

const STAT_CARDS: { key: ProjectStatus; label: string }[] = [
  { key: 'pre_production',  label: 'Pre-produccion'  },
  { key: 'production',      label: 'En produccion'   },
  { key: 'post_production', label: 'Post-produccion' },
  { key: 'delivered',       label: 'Entregados'      },
]

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; client?: string }>
}

export default async function AdminProjectsPage({ searchParams }: PageProps) {
  const { q, status, client: clientFilter } = await searchParams

  const serviceClient = createServiceClient()

  const [, { counts, totalBudgetAll, totalBudgetDelivered }] = await Promise.all([
    createClient(),
    serviceClient
      .from('projects')
      .select('status, budget')
      .then(({ data }) => {
        const c: Record<string, number> = {
          pre_production:  0,
          production:      0,
          post_production: 0,
          delivered:       0,
        }
        let budgetAll = 0
        let budgetDelivered = 0
        for (const row of data ?? []) {
          if (row.status in c) c[row.status]++
          if (row.budget != null) {
            budgetAll += row.budget as number
            if (row.status === 'delivered') budgetDelivered += row.budget as number
          }
        }
        return { counts: c, totalBudgetAll: budgetAll, totalBudgetDelivered: budgetDelivered }
      }),
  ])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const { data: allClients } = await serviceClient
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  const clients: Pick<Client, 'id' | 'name'>[] = (allClients ?? []) as Pick<Client, 'id' | 'name'>[]

  let query = serviceClient
    .from('projects')
    .select(
      `
      id,
      title,
      description,
      status,
      client_id,
      start_date,
      end_date,
      created_at,
      updated_at,
      budget,
      currency,
      client:clients(
        id,
        name,
        email,
        company,
        avatar_url,
        profile_id,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false })

  if (q && q.trim().length > 0) {
    query = query.ilike('title', `%${q.trim()}%`)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status as ProjectStatus)
  }

  if (clientFilter && clientFilter !== 'all') {
    query = query.eq('client_id', clientFilter)
  }

  const { data: projects, error } = await query
  const rows = (projects ?? []) as unknown as ProjectWithClient[]

  const hasFilters =
    (q && q.trim().length > 0) ||
    (status && status !== 'all') ||
    (clientFilter && clientFilter !== 'all')

  return (
    <>
    <style>{`
      .proj-row { transition: background 0.1s ease; }
      .proj-row:hover { background: var(--dash-surface-2) !important; }
      .proj-title-link { color: var(--dash-text-primary); text-decoration: none; transition: color 0.15s; }
      .proj-title-link:hover { color: #0071E3 !important; }
      .proj-arrow-btn { color: var(--dash-text-tertiary); background: transparent; transition: color 0.15s, background 0.15s; }
      .proj-arrow-btn:hover { color: var(--dash-text-primary) !important; background: var(--dash-surface-3) !important; }
      .proj-new-btn { opacity: 1; transition: opacity 0.15s ease; }
      .proj-new-btn:hover { opacity: 0.88 !important; }
    `}</style>
    <div
      style={{
        padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)',
        background: T.bg,
        minHeight: '100vh',
        fontFamily: T.font,
      }}
    >
      {/* Page header */}
      <div className="flex items-start justify-between" style={{ marginBottom: '28px' }}>
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: T.textPrimary,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Proyectos
          </h1>
          <p
            style={{
              marginTop: '6px',
              fontSize: '13px',
              color: T.textSecondary,
              margin: '6px 0 0',
            }}
          >
            {rows.length} proyecto{rows.length !== 1 ? 's' : ''}
            {hasFilters ? ' (filtrado)' : ''}
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="proj-new-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            background: T.accent,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          + Nuevo proyecto
        </Link>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap" style={{ marginBottom: '24px' }}>
        {/* Total card */}
        <div
          style={{
            background: T.surface1,
            borderRadius: '12px',
            padding: '14px 20px',
            minWidth: '100px',
          }}
        >
          <p style={{ fontSize: '11px', color: T.textTertiary, fontWeight: 500, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total
          </p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: T.textPrimary, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
            {total}
          </p>
        </div>

        {STAT_CARDS.map((s) => {
          const { color } = PROJECT_STATUS_STYLES[s.key] ?? { color: 'var(--dash-text-secondary)' }
          return (
            <div
              key={s.key}
              style={{
                background: T.surface1,
                borderRadius: '12px',
                padding: '14px 20px',
                minWidth: '120px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: T.textTertiary,
                }}
              >
                {s.label}
              </p>
              <p
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color,
                  margin: '4px 0 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {counts[s.key] ?? 0}
              </p>
            </div>
          )
        })}

        {/* Revenue — total budget and delivered budget */}
        <div
          style={{
            background: T.surface1,
            borderRadius: '12px',
            padding: '14px 20px',
            minWidth: '200px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: T.textTertiary,
            }}
          >
            Presupuesto
          </p>
          <p
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#30D158',
              margin: '4px 0 0',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {totalBudgetAll > 0
              ? `${formatBudgetCompact(totalBudgetAll)} total | ${formatBudgetCompact(totalBudgetDelivered)} entregado`
              : '—'}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: '20px' }}>
        <ProjectsFilterBar
          clients={clients}
          currentQ={q ?? ''}
          currentStatus={status ?? 'all'}
          currentClient={clientFilter ?? 'all'}
          hasFilters={Boolean(hasFilters)}
        />
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            border: '1px solid rgba(255,69,58,0.25)',
            background: 'rgba(255,69,58,0.08)',
            borderRadius: '12px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#FF453A', margin: 0 }}>
            Error al cargar proyectos: {error.message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !error ? (
        hasFilters ? (
          /* Filtered empty */
          <AnimatedEmptyState>
          <div
            style={{
              padding: '80px 20px',
              textAlign: 'center',
              background: T.surface1,
              borderRadius: '16px',
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              aria-hidden="true"
              style={{ display: 'block', margin: '0 auto 20px' }}
            >
              <rect x="16" y="12" width="48" height="56" rx="6" fill="var(--dash-surface-3)" stroke="#3A3A3C" strokeWidth="1.5" />
              <line x1="26" y1="26" x2="54" y2="26" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="26" y1="34" x2="46" y2="34" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="26" y1="42" x2="50" y2="42" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="57" cy="57" r="13" fill="var(--dash-surface-2)" stroke="#3A3A3C" strokeWidth="1.5" />
              <line x1="52" y1="57" x2="62" y2="57" stroke="var(--dash-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: T.textSecondary,
                margin: '0 0 8px',
                letterSpacing: '-0.01em',
              }}
            >
              Sin resultados
            </h3>
            <p style={{ fontSize: '13px', color: T.textTertiary, margin: 0 }}>
              No hay proyectos que coincidan con los filtros aplicados.
            </p>
          </div>
          </AnimatedEmptyState>
        ) : (
          /* True empty */
          <AnimatedEmptyState>
          <div
            style={{
              padding: '80px 20px',
              textAlign: 'center',
              background: T.surface1,
              borderRadius: '16px',
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              aria-hidden="true"
              style={{ display: 'block', margin: '0 auto 20px' }}
            >
              {/* Clapperboard icon */}
              <rect x="12" y="28" width="56" height="40" rx="6" fill="var(--dash-surface-3)" stroke="#3A3A3C" strokeWidth="1.5" />
              <rect x="12" y="14" width="56" height="16" rx="4" fill="var(--dash-surface-3)" stroke="#3A3A3C" strokeWidth="1.5" />
              {/* Clap stripes */}
              <line x1="24" y1="14" x2="20" y2="30" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="34" y1="14" x2="30" y2="30" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="44" y1="14" x2="40" y2="30" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="54" y1="14" x2="50" y2="30" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" />
              {/* Play triangle */}
              <path d="M35 44l14 8-14 8V44z" fill="#3A3A3C" />
            </svg>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: T.textPrimary,
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              Sin proyectos todavia
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: T.textSecondary,
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}
            >
              Crea tu primer proyecto para empezar a gestionar tu trabajo.
            </p>
            <Link
              href="/admin/projects/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                background: T.accent,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              + Nuevo proyecto
            </Link>
          </div>
          </AnimatedEmptyState>
        )
      ) : (
        <ProjectsTable rows={rows} pageSize={15} />
      )}
    </div>
    </>
  )
}
