import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus, ProjectWithClient, Client } from '@/lib/supabase/types'
import { ProjectsFilterBar } from '@/components/admin/projects/projects-filter-bar'
import { ProjectsTable } from '@/components/admin/projects/ProjectsTable'

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

// ── Status config ─────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  color: string
}

const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  pre_production:  { label: 'Pre-produccion',  color: '#FF9F0A' },
  production:      { label: 'Produccion',       color: '#0071E3' },
  post_production: { label: 'Post-produccion',  color: '#BF5AF2' },
  delivered:       { label: 'Entregado',        color: '#30D158' },
}

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

  const [supabase, counts] = await Promise.all([
    createClient(),
    serviceClient
      .from('projects')
      .select('status')
      .then(({ data }) => {
        const c: Record<string, number> = {
          pre_production:  0,
          production:      0,
          post_production: 0,
          delivered:       0,
        }
        for (const row of data ?? []) {
          if (row.status in c) c[row.status]++
        }
        return c
      }),
  ])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const { data: allClients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  const clients: Pick<Client, 'id' | 'name'>[] = (allClients ?? []) as Pick<Client, 'id' | 'name'>[]

  let query = supabase
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
  const rows = (projects ?? []) as ProjectWithClient[]

  const hasFilters =
    (q && q.trim().length > 0) ||
    (status && status !== 'all') ||
    (clientFilter && clientFilter !== 'all')

  return (
    <>
    <style>{`
      .proj-row { transition: background 0.1s ease; }
      .proj-row:hover { background: #1C1C1E !important; }
      .proj-title-link { color: #F5F5F7; text-decoration: none; transition: color 0.15s; }
      .proj-title-link:hover { color: #0071E3 !important; }
      .proj-arrow-btn { color: #48484A; background: transparent; transition: color 0.15s, background 0.15s; }
      .proj-arrow-btn:hover { color: #F5F5F7 !important; background: #2C2C2E !important; }
      .proj-new-btn { opacity: 1; transition: opacity 0.15s ease; }
      .proj-new-btn:hover { opacity: 0.88 !important; }
    `}</style>
    <div
      style={{
        padding: '40px 32px',
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
          const { color } = STATUS_CONFIG[s.key]
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
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            background: T.surface1,
            borderRadius: '16px',
          }}
        >
          <p style={{ fontSize: '14px', color: T.textTertiary, margin: 0 }}>
            {hasFilters
              ? 'No hay proyectos que coincidan con los filtros.'
              : 'No hay proyectos todavia.'}
          </p>
        </div>
      ) : (
        <ProjectsTable rows={rows} pageSize={15} />
      )}
    </div>
    </>
  )
}
