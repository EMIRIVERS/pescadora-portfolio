import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Client, ProjectStatus } from '@/lib/supabase/types'
import { InviteClientButton } from '@/components/admin/clients/invite-client-button'
import { ClientCardItem } from '@/components/admin/clients/ClientCardItem'
import type { ClientCard as ClientCardType } from '@/components/admin/clients/ClientCardItem'
import { AnimatedEmptyState } from '@/components/admin/AnimatedEmptyState'

// ── Design tokens ──────────────────────────────────────────────────────────────

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#0071E3', // blue
  '#30D158', // green
  '#FF9F0A', // orange
  '#BF5AF2', // purple
  '#FF453A', // red
  '#64D2FF', // cyan
  '#FFD60A', // yellow
] as const

const ACTIVE_STATUSES: ProjectStatus[] = ['pre_production', 'production', 'post_production']

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string
  status: ProjectStatus
  created_at: string
  client_id: string | null
  budget: number | null
}

// LeadRow used only to count converted leads
interface LeadRow {
  converted_to_client_id: string | null
}

interface ClientCard extends Client {
  project_count: number
  active_count: number
  delivered_count: number
  converted_lead_count: number
  most_recent_project_status: ProjectStatus | null
  lifetime_value: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const supabase = createServiceClient()

  const [
    { data: clientsData, error: clientsError },
    { data: projectsData },
    { data: leadsData },
  ] = await Promise.all([
    (() => {
      let query = supabase
        .from('clients')
        .select('id, name, email, company, avatar_url, profile_id, created_at')
        .order('name', { ascending: true })
      if (q) {
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`)
      }
      return query
    })(),
    supabase
      .from('projects')
      .select('id, status, created_at, client_id, budget'),
    supabase
      .from('leads')
      .select('converted_to_client_id')
      .not('converted_to_client_id', 'is', null),
  ])

  const clients: Client[] = (clientsData ?? []) as unknown as Client[]
  const projects: ProjectRow[] = (projectsData ?? []) as ProjectRow[]

  // Index projects by client_id
  const projectsByClient = new Map<string, ProjectRow[]>()
  for (const project of projects) {
    if (project.client_id === null) continue
    const existing = projectsByClient.get(project.client_id) ?? []
    existing.push(project)
    projectsByClient.set(project.client_id, existing)
  }

  // Index converted lead counts by client_id
  const convertedLeadsByClient = new Map<string, number>()
  for (const lead of (leadsData ?? []) as LeadRow[]) {
    const cid = lead.converted_to_client_id
    if (cid === null) continue
    convertedLeadsByClient.set(cid, (convertedLeadsByClient.get(cid) ?? 0) + 1)
  }

  // Build enriched cards
  const enrichedCards: ClientCard[] = clients.map((client) => {
    const clientProjects = projectsByClient.get(client.id) ?? []
    const active_count = clientProjects.filter((p) =>
      ACTIVE_STATUSES.includes(p.status)
    ).length
    const delivered_count = clientProjects.filter(
      (p) => p.status === 'delivered'
    ).length
    const sorted = [...clientProjects].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const most_recent_project_status: ProjectStatus | null = sorted[0]?.status ?? null
    const lifetime_value = clientProjects.reduce((sum, p) => sum + (p.budget ?? 0), 0)
    return {
      ...client,
      project_count: clientProjects.length,
      active_count,
      delivered_count,
      converted_lead_count: convertedLeadsByClient.get(client.id) ?? 0,
      most_recent_project_status,
      lifetime_value,
    }
  })

  // Stats
  const totalClients = enrichedCards.length
  const withActiveProjects = enrichedCards.filter((c) => c.active_count > 0).length
  const withoutActiveProjects = totalClients - withActiveProjects

  const stats = [
    { label: 'Total clientes', value: totalClients },
    { label: 'Con proyectos activos', value: withActiveProjects },
    { label: 'Sin proyectos activos', value: withoutActiveProjects },
  ]

  return (
    <>
    <style>{`
      .client-card { background-color: var(--dash-surface-1); border: 1px solid var(--dash-border); transition: background-color 0.15s ease, border-color 0.15s ease; }
      .client-card:hover { background-color: var(--dash-surface-2) !important; border-color: var(--dash-border) !important; }
      .client-email-link { color: var(--dash-text-secondary); transition: color 0.15s ease; }
      .client-email-link:hover { color: #0071E3 !important; }
      .client-detail-link { color: var(--dash-text-primary); transition: color 0.15s ease; }
      .client-detail-link:hover { color: #0071E3 !important; }
      .search-input { background-color: var(--dash-surface-2); border: 1px solid var(--dash-border); border-radius: 10px; padding: 10px 16px; color: var(--dash-text-primary); outline: none; width: 100%; font-size: 14px; box-sizing: border-box; }
      .search-input::placeholder { color: var(--dash-text-tertiary); }
      .search-input:focus { border-color: rgba(0,113,227,0.5); }
      .search-btn { background-color: #0071E3; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background-color 0.15s ease; }
      .search-btn:hover { background-color: #0077ED !important; }
      .search-clear-link { color: var(--dash-text-secondary); font-size: 13px; text-decoration: none; white-space: nowrap; transition: color 0.15s ease; }
      .search-clear-link:hover { color: var(--dash-text-primary) !important; }
    `}</style>
    <div
      style={{
        padding: '40px 32px',
        minHeight: '100%',
        backgroundColor: 'var(--dash-bg)',
        fontFamily: SF,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Clientes
          </h1>
          <p
            style={{
              marginTop: '6px',
              fontSize: '13px',
              color: 'var(--dash-text-secondary)',
              letterSpacing: '-0.01em',
            }}
          >
            {totalClients} cliente{totalClients !== 1 ? 's' : ''}
            {q ? (
              <span style={{ color: 'var(--dash-text-tertiary)' }}>
                {' · '}busqueda: &ldquo;{q}&rdquo;
              </span>
            ) : (
              <span>
                {' '}registrado{totalClients !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <InviteClientButton />
      </div>

      {/* Error */}
      {clientsError && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 16px',
            backgroundColor: 'rgba(255,69,58,0.08)',
            border: '1px solid rgba(255,69,58,0.2)',
            borderRadius: '12px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#FF453A' }}>
            Error al cargar clientes: {clientsError.message}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {stats.map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--dash-text-tertiary)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <form
        method="GET"
        action="/admin/clients"
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <input
          className="search-input"
          name="q"
          type="text"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre, email o empresa..."
          style={{ fontFamily: SF }}
        />
        <button
          className="search-btn"
          type="submit"
          style={{ fontFamily: SF }}
        >
          Buscar
        </button>
        {q && (
          <Link
            href="/admin/clients"
            className="search-clear-link"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Empty state */}
      {enrichedCards.length === 0 && !clientsError ? (
        <AnimatedEmptyState>
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: '16px',
          }}
        >
          {q ? (
            <p style={{ fontSize: '14px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              No se encontraron clientes para &ldquo;{q}&rdquo;.
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              No hay clientes todavia. Invita al primer cliente usando el boton de arriba.
            </p>
          )}
        </div>
        </AnimatedEmptyState>
      ) : (
        /* Client cards grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '12px',
          }}
        >
          {enrichedCards.map((client, index) => {
            const color = avatarColor(client.name)
            return (
              <ClientCardItem
                key={client.id}
                client={client as ClientCardType}
                color={color}
                index={index}
              />
            )
          })}
        </div>
      )}
    </div>
    </>
  )
}
