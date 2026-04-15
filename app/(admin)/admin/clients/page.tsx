import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Client, ProjectStatus } from '@/lib/supabase/types'
import { InviteClientButton } from '@/components/admin/clients/invite-client-button'

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#e8341a', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'] as const

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
  const code = name.charCodeAt(0) ?? 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function statusLabel(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    pre_production: 'Pre-producción',
    production: 'Producción',
    post_production: 'Post-producción',
    delivered: 'Entregado',
  }
  return map[status]
}

function statusColor(status: ProjectStatus): string {
  if (status === 'delivered') return 'text-[#10b981] border-[#10b981]/20 bg-[#10b981]/5'
  if (status === 'post_production') return 'text-[#8b5cf6] border-[#8b5cf6]/20 bg-[#8b5cf6]/5'
  if (status === 'production') return 'text-[#3b82f6] border-[#3b82f6]/20 bg-[#3b82f6]/5'
  return 'text-[#f59e0b] border-[#f59e0b]/20 bg-[#f59e0b]/5'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminClientsPage() {
  const supabase = createServiceClient()

  const [
    { data: clientsData, error: clientsError },
    { data: projectsData },
    { data: leadsData },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, email, company, avatar_url, profile_id, created_at')
      .order('name', { ascending: true }),
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

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-lg font-mono tracking-[0.2em] text-[#e8e8e8] uppercase font-bold">
            Clientes
          </h1>
          <p className="mt-1 text-xs font-mono text-[#555] tracking-wide">
            {totalClients} cliente{totalClients !== 1 ? 's' : ''} registrado
            {totalClients !== 1 ? 's' : ''}
          </p>
        </div>
        <InviteClientButton />
      </div>

      {/* Error */}
      {clientsError && (
        <div className="mb-6 p-4 border border-red-900/40 bg-red-950/20 rounded-sm">
          <p className="text-xs font-mono text-red-400/80">
            Error al cargar clientes: {clientsError.message}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total clientes', value: totalClients },
          { label: 'Con proyectos activos', value: withActiveProjects },
          { label: 'Sin proyectos activos', value: withoutActiveProjects },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm px-5 py-4"
          >
            <p className="text-[9px] font-mono tracking-[0.25em] uppercase text-[#444] mb-1">
              {label}
            </p>
            <p className="text-2xl font-mono text-[#e8e8e8] tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {enrichedCards.length === 0 && !clientsError ? (
        <div className="py-20 text-center border border-[#1a1a1a] rounded-sm bg-[#0d0d0d]">
          <p className="text-xs font-mono text-[#444] tracking-wide">
            No hay clientes todavia.
          </p>
        </div>
      ) : (
        /* Client cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {enrichedCards.map((client) => {
            const color = avatarColor(client.name)
            return (
              <div
                key={client.id}
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm p-5 hover:border-[#2a2a2a] transition-colors flex flex-col gap-3"
              >
                {/* Top: avatar + name + company */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}
                  >
                    <span
                      className="text-[11px] font-mono font-bold"
                      style={{ color }}
                    >
                      {initials(client.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-bold text-[#e8e8e8] truncate">
                      {client.name}
                    </p>
                    {client.company && (
                      <p className="text-[10px] font-mono text-[#555] truncate mt-0.5">
                        {client.company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="text-[11px] font-mono text-[#444] hover:text-[#888] truncate transition-colors"
                  >
                    {client.email}
                  </a>
                ) : (
                  <span className="text-[11px] font-mono text-[#2a2a2a]">
                    Sin email
                  </span>
                )}

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  {/* Project count */}
                  <span
                    className={[
                      'inline-block px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-[0.1em] uppercase border',
                      client.project_count > 0
                        ? 'bg-[#0d1a2e] text-[#6fa3e0] border-[#1a3050]'
                        : 'bg-[#111] text-[#444] border-[#1a1a1a]',
                    ].join(' ')}
                  >
                    {client.project_count} proyecto{client.project_count !== 1 ? 's' : ''}
                  </span>

                  {/* Most recent project status */}
                  {client.most_recent_project_status !== null && (
                    <span
                      className={[
                        'inline-block px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-[0.1em] uppercase border',
                        statusColor(client.most_recent_project_status),
                      ].join(' ')}
                    >
                      {statusLabel(client.most_recent_project_status)}
                    </span>
                  )}

                  {/* Converted from lead */}
                  {client.converted_lead_count > 0 && (
                    <span className="inline-block px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-[0.1em] uppercase border bg-[#1a1200] text-[#a07a00] border-[#2e2200]">
                      Lead convertido
                    </span>
                  )}
                </div>

                {/* Footer link */}
                <div className="mt-auto pt-2 border-t border-[#111]">
                  <Link
                    href={`/admin/projects?client=${client.id}`}
                    className="text-[10px] font-mono text-[#555] hover:text-[#e8e8e8] tracking-[0.1em] uppercase transition-colors"
                  >
                    Ver proyectos →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
