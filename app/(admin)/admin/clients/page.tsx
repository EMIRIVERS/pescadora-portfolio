import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Client, ProjectStatus } from '@/lib/supabase/types'
import { InviteClientButton } from '@/components/admin/clients/invite-client-button'

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
}

interface LeadRow {
  converted_to_client_id: string | null
}

interface ClientCard extends Client {
  project_count: number
  active_count: number
  delivered_count: number
  converted_lead_count: number
  most_recent_project_status: ProjectStatus | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function statusLabel(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    pre_production: 'Pre-produccion',
    production: 'Produccion',
    post_production: 'Post-produccion',
    delivered: 'Entregado',
  }
  return map[status]
}

interface StatusStyle {
  color: string
  backgroundColor: string
  border: string
}

function statusStyle(status: ProjectStatus): StatusStyle {
  if (status === 'delivered') {
    return {
      color: '#30D158',
      backgroundColor: 'rgba(48,209,88,0.1)',
      border: '1px solid rgba(48,209,88,0.2)',
    }
  }
  if (status === 'post_production') {
    return {
      color: '#BF5AF2',
      backgroundColor: 'rgba(191,90,242,0.1)',
      border: '1px solid rgba(191,90,242,0.2)',
    }
  }
  if (status === 'production') {
    return {
      color: '#0071E3',
      backgroundColor: 'rgba(0,113,227,0.1)',
      border: '1px solid rgba(0,113,227,0.2)',
    }
  }
  return {
    color: '#FF9F0A',
    backgroundColor: 'rgba(255,159,10,0.1)',
    border: '1px solid rgba(255,159,10,0.2)',
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
      .select('id, status, created_at, client_id'),
    supabase
      .from('leads')
      .select('converted_to_client_id')
      .not('converted_to_client_id', 'is', null),
  ])

  const clients: Client[] = clientsData ?? []
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
  for (const lead of leadsData ?? []) {
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
    return {
      ...client,
      project_count: clientProjects.length,
      active_count,
      delivered_count,
      converted_lead_count: convertedLeadsByClient.get(client.id) ?? 0,
      most_recent_project_status,
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
      .client-card { background-color: #111111; border: 1px solid rgba(255,255,255,0.06); transition: background-color 0.15s ease, border-color 0.15s ease; }
      .client-card:hover { background-color: #1C1C1E !important; border-color: rgba(255,255,255,0.1) !important; }
      .client-email-link { color: #86868B; transition: color 0.15s ease; }
      .client-email-link:hover { color: #0071E3 !important; }
      .client-detail-link { color: #F5F5F7; transition: color 0.15s ease; }
      .client-detail-link:hover { color: #0071E3 !important; }
      .search-input { background-color: #1C1C1E; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 16px; color: #F5F5F7; outline: none; width: 100%; font-size: 14px; box-sizing: border-box; }
      .search-input::placeholder { color: #48484A; }
      .search-input:focus { border-color: rgba(0,113,227,0.5); }
      .search-btn { background-color: #0071E3; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background-color 0.15s ease; }
      .search-btn:hover { background-color: #0077ED !important; }
      .search-clear-link { color: #86868B; font-size: 13px; text-decoration: none; white-space: nowrap; transition: color 0.15s ease; }
      .search-clear-link:hover { color: #F5F5F7 !important; }
    `}</style>
    <div
      style={{
        padding: '40px 32px',
        minHeight: '100%',
        backgroundColor: '#000000',
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
              color: '#F5F5F7',
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
              color: '#86868B',
              letterSpacing: '-0.01em',
            }}
          >
            {totalClients} cliente{totalClients !== 1 ? 's' : ''}
            {q ? (
              <span style={{ color: '#48484A' }}>
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
              backgroundColor: '#111111',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#48484A',
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
                color: '#F5F5F7',
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
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            backgroundColor: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
          }}
        >
          {q ? (
            <>
              <p style={{ fontSize: '15px', color: '#48484A' }}>
                No se encontraron clientes para &ldquo;{q}&rdquo;.
              </p>
              <p style={{ fontSize: '13px', color: '#2C2C2E', marginTop: '6px' }}>
                <Link
                  href="/admin/clients"
                  style={{ color: '#0071E3', textDecoration: 'none' }}
                >
                  Ver todos los clientes
                </Link>
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '15px', color: '#48484A' }}>
                No hay clientes todavia.
              </p>
              <p style={{ fontSize: '13px', color: '#2C2C2E', marginTop: '6px' }}>
                Invita al primer cliente usando el boton de arriba.
              </p>
            </>
          )}
        </div>
      ) : (
        /* Client cards grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '12px',
          }}
        >
          {enrichedCards.map((client) => {
            const color = avatarColor(client.name)
            return (
              <ClientCardItem
                key={client.id}
                client={client}
                color={color}
              />
            )
          })}
        </div>
      )}
    </div>
    </>
  )
}

// ── Client card (separate component for hover state) ──────────────────────────

interface ClientCardItemProps {
  client: ClientCard
  color: string
}

function ClientCardItem({ client, color }: ClientCardItemProps) {
  const sStyle = client.most_recent_project_status !== null
    ? statusStyle(client.most_recent_project_status)
    : null

  return (
    <div
      className="client-card"
      style={{
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'default',
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
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
        {/* Fecha de registro */}
        <span
          style={{
            fontSize: '12px',
            color: '#48484A',
          }}
        >
          Desde {formatDate(client.created_at)}
        </span>
        <span style={{ fontSize: '12px', color: '#2C2C2E' }}>·</span>
        {/* Numero de proyectos */}
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
        {/* Most recent project status */}
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

        {/* Converted from lead */}
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

        {/* Portal access badge */}
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
    </div>
  )
}
