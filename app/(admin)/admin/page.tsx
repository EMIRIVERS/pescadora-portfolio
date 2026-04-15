import Link from 'next/link'
import { FolderKanban, Users, Target, CheckCircle2, Film } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus, LeadStatus, LeadSource } from '@/lib/supabase/types'

// ─── Local types ────────────────────────────────────────────────────────────

interface RecentProject {
  id: string
  title: string
  status: ProjectStatus
  created_at: string
  client: { name: string } | null
}

interface RecentLead {
  id: string
  name: string
  status: LeadStatus
  source: LeadSource
  created_at: string
}

interface LeadsByStatus {
  new: number
  contacted: number
  qualified: number
  proposal: number
  won: number
  lost: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function todayLabel(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  pre_production: 'Pre-prod',
  production: 'Produccion',
  post_production: 'Post-prod',
  delivered: 'Entregado',
}

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  pre_production: '#555',
  production: '#22c55e',
  post_production: '#f59e0b',
  delivered: '#3b82f6',
}

const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: '#3b82f6',
  contacted: '#a855f7',
  qualified: '#f59e0b',
  proposal: '#ef4444',
  won: '#22c55e',
  lost: '#555',
}

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  won: 'Ganado',
  lost: 'Perdido',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createServiceClient()

  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: totalClients },
    { data: leadsRaw },
    { data: recentProjectsRaw },
    { data: recentLeadsRaw },
    { count: totalPortfolioVideos },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'production'),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('leads')
      .select('status'),
    supabase
      .from('projects')
      .select('id, title, status, created_at, client:clients(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('id, name, status, source, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('portfolio_videos')
      .select('id', { count: 'exact', head: true })
      .eq('is_visible', true),
  ])

  // Aggregate leads by status
  const leadsByStatus: LeadsByStatus = {
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal: 0,
    won: 0,
    lost: 0,
  }
  for (const row of leadsRaw ?? []) {
    const s = row.status as LeadStatus
    if (s in leadsByStatus) leadsByStatus[s]++
  }
  const totalLeads = (leadsRaw ?? []).length
  const activeLeads = totalLeads - leadsByStatus.won - leadsByStatus.lost

  // Coerce joined data — Supabase returns client as object or null
  const recentProjects: RecentProject[] = (recentProjectsRaw ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status as ProjectStatus,
    created_at: p.created_at,
    client: Array.isArray(p.client)
      ? (p.client[0] ?? null)
      : (p.client as { name: string } | null),
  }))

  const recentLeads: RecentLead[] = (recentLeadsRaw ?? []) as RecentLead[]

  // ── Stats cards definition ─────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Proyectos activos',
      value: activeProjects ?? 0,
      icon: FolderKanban,
    },
    {
      label: 'Clientes',
      value: totalClients ?? 0,
      icon: Users,
    },
    {
      label: 'Leads activos',
      value: activeLeads,
      icon: Target,
    },
    {
      label: 'Leads ganados',
      value: leadsByStatus.won,
      icon: CheckCircle2,
    },
    {
      label: 'Videos en portfolio',
      value: totalPortfolioVideos ?? 0,
      icon: Film,
    },
  ] as const

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: '#0d0d0d',
        minHeight: '100vh',
        padding: '2.5rem 2rem',
        maxWidth: '1280px',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '2.5rem',
          borderBottom: '1px solid #1a1a1a',
          paddingBottom: '1.25rem',
        }}
      >
        <h1
          className="font-mono tracking-[0.2em] uppercase"
          style={{ color: '#e8e8e8', fontSize: '0.85rem', margin: 0 }}
        >
          Dashboard
        </h1>
        <span
          className="font-mono capitalize"
          style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '0.05em' }}
        >
          {todayLabel()}
        </span>
      </div>

      {/* ── Top stats row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.75rem',
          marginBottom: '2rem',
        }}
      >
        {statCards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            style={{
              border: '1px solid #1a1a1a',
              borderRadius: '2px',
              backgroundColor: '#0d0d0d',
              padding: '1.25rem 1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '0.75rem',
              }}
            >
              <Icon size={13} color="#444" strokeWidth={1.5} />
              <span
                className="font-mono uppercase"
                style={{
                  color: '#555',
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                }}
              >
                {label}
              </span>
            </div>
            <p
              className="font-mono tabular-nums"
              style={{ color: '#e8e8e8', fontSize: '1.75rem', margin: 0, lineHeight: 1 }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Two-column section ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* ── Proyectos recientes ── */}
        <div
          style={{
            border: '1px solid #1a1a1a',
            borderRadius: '2px',
            backgroundColor: '#0d0d0d',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <span
              className="font-mono uppercase"
              style={{ color: '#e8e8e8', fontSize: '0.65rem', letterSpacing: '0.2em' }}
            >
              Proyectos recientes
            </span>
            <Link
              href="/admin/projects"
              className="font-mono"
              style={{ color: '#555', fontSize: '0.6rem', textDecoration: 'none' }}
            >
              Ver todos →
            </Link>
          </div>

          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 0.9fr 0.8fr',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #1a1a1a',
              marginBottom: '0.25rem',
            }}
          >
            {['Proyecto', 'Cliente', 'Estado', 'Fecha'].map((h) => (
              <span
                key={h}
                className="font-mono uppercase"
                style={{ color: '#333', fontSize: '0.55rem', letterSpacing: '0.15em' }}
              >
                {h}
              </span>
            ))}
          </div>

          {recentProjects.length === 0 && (
            <p
              className="font-mono"
              style={{ color: '#333', fontSize: '0.65rem', marginTop: '0.75rem' }}
            >
              Sin proyectos registrados.
            </p>
          )}

          {recentProjects.map((project) => (
            <div
              key={project.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 0.9fr 0.8fr',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.6rem 0',
                borderBottom: '1px solid #111',
              }}
            >
              <Link
                href={`/admin/projects/${project.id}`}
                className="font-mono"
                style={{
                  color: '#e8e8e8',
                  fontSize: '0.65rem',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {project.title}
              </Link>
              <span
                className="font-mono"
                style={{
                  color: '#666',
                  fontSize: '0.6rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {project.client?.name ?? '—'}
              </span>
              <span
                className="font-mono"
                style={{
                  color: PROJECT_STATUS_COLOR[project.status],
                  fontSize: '0.55rem',
                  letterSpacing: '0.05em',
                }}
              >
                {PROJECT_STATUS_LABEL[project.status]}
              </span>
              <span
                className="font-mono"
                style={{ color: '#444', fontSize: '0.55rem' }}
              >
                {formatDate(project.created_at)}
              </span>
            </div>
          ))}
        </div>

        {/* ── Leads recientes ── */}
        <div
          style={{
            border: '1px solid #1a1a1a',
            borderRadius: '2px',
            backgroundColor: '#0d0d0d',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <span
              className="font-mono uppercase"
              style={{ color: '#e8e8e8', fontSize: '0.65rem', letterSpacing: '0.2em' }}
            >
              Leads recientes
            </span>
            <Link
              href="/admin/leads"
              className="font-mono"
              style={{ color: '#555', fontSize: '0.6rem', textDecoration: 'none' }}
            >
              Ver pipeline →
            </Link>
          </div>

          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 0.8fr',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #1a1a1a',
              marginBottom: '0.25rem',
            }}
          >
            {['Lead', 'Estado', 'Fuente', 'Fecha'].map((h) => (
              <span
                key={h}
                className="font-mono uppercase"
                style={{ color: '#333', fontSize: '0.55rem', letterSpacing: '0.15em' }}
              >
                {h}
              </span>
            ))}
          </div>

          {recentLeads.length === 0 && (
            <p
              className="font-mono"
              style={{ color: '#333', fontSize: '0.65rem', marginTop: '0.75rem' }}
            >
              Sin leads registrados.
            </p>
          )}

          {recentLeads.map((lead) => (
            <div
              key={lead.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 0.8fr',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.6rem 0',
                borderBottom: '1px solid #111',
              }}
            >
              <Link
                href={`/admin/leads/${lead.id}`}
                className="font-mono"
                style={{
                  color: '#e8e8e8',
                  fontSize: '0.65rem',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {lead.name}
              </Link>
              <span
                className="font-mono"
                style={{
                  color: LEAD_STATUS_COLOR[lead.status],
                  fontSize: '0.55rem',
                  letterSpacing: '0.05em',
                }}
              >
                {LEAD_STATUS_LABEL[lead.status]}
              </span>
              <span
                className="font-mono"
                style={{
                  color: '#555',
                  fontSize: '0.55rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {lead.source}
              </span>
              <span
                className="font-mono"
                style={{ color: '#444', fontSize: '0.55rem' }}
              >
                {formatDate(lead.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick access ── */}
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '1.5rem' }}>
        <p
          className="font-mono uppercase"
          style={{
            color: '#333',
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            marginBottom: '0.75rem',
          }}
        >
          Accesos rapidos
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { label: 'Portfolio', href: '/admin/portfolio' },
            { label: 'Proyectos', href: '/admin/projects' },
            { label: 'Kanban', href: '/admin/kanban' },
            { label: 'Clientes', href: '/admin/clients' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Equipo', href: '/admin/team' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono"
              style={{
                padding: '0.4rem 0.85rem',
                border: '1px solid #1a1a1a',
                borderRadius: '2px',
                color: '#555',
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                textDecoration: 'none',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.color = '#ccc'
                el.style.borderColor = '#333'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.color = '#555'
                el.style.borderColor = '#1a1a1a'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
