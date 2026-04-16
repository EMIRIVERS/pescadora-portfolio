import Link from 'next/link'
import { FolderKanban, Users, Target, CheckCircle2, Film } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus, LeadStatus, LeadSource, DeliverableStatus } from '@/lib/supabase/types'

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

interface UpcomingDeliverable {
  id: string
  title: string
  due_date: string
  status: DeliverableStatus
  project: { id: string; title: string } | null
}

interface NewLead {
  id: string
  name: string
  email: string
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

function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `hace ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'hace 1 dia'
  return `hace ${diffDays} dias`
}

function daysUntil(isoDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(isoDate)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}

function greetingLabel(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Buenos dias'
  if (hour >= 12 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  pre_production: 'Pre-prod',
  production: 'Produccion',
  post_production: 'Post-prod',
  delivered: 'Entregado',
}

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  pre_production: '#48484A',
  production: '#30D158',
  post_production: '#FF9F0A',
  delivered: '#0071E3',
}

const PROJECT_STATUS_BG: Record<ProjectStatus, string> = {
  pre_production: 'rgba(72,72,74,0.18)',
  production: 'rgba(48,209,88,0.13)',
  post_production: 'rgba(255,159,10,0.13)',
  delivered: 'rgba(0,113,227,0.13)',
}

const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: '#0071E3',
  contacted: '#BF5AF2',
  qualified: '#FF9F0A',
  proposal: '#FF6961',
  won: '#30D158',
  lost: '#48484A',
}

const LEAD_STATUS_BG: Record<LeadStatus, string> = {
  new: 'rgba(0,113,227,0.13)',
  contacted: 'rgba(191,90,242,0.13)',
  qualified: 'rgba(255,159,10,0.13)',
  proposal: 'rgba(255,105,97,0.13)',
  won: 'rgba(48,209,88,0.13)',
  lost: 'rgba(72,72,74,0.13)',
}

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  won: 'Ganado',
  lost: 'Perdido',
}

const DELIVERABLE_STATUS_COLOR: Record<DeliverableStatus, string> = {
  pending: '#FF9F0A',
  review: '#BF5AF2',
  approved: '#30D158',
}

const DELIVERABLE_STATUS_BG: Record<DeliverableStatus, string> = {
  pending: 'rgba(255,159,10,0.13)',
  review: 'rgba(191,90,242,0.13)',
  approved: 'rgba(48,209,88,0.13)',
}

const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  pending: 'Pendiente',
  review: 'En revision',
  approved: 'Aprobado',
}

// ─── Stat card accent colours (icon + number tint) ───────────────────────────

const STAT_ACCENT = ['#0071E3', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A'] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // project_deliverables.due_date is a date column (YYYY-MM-DD), so compare as date string
  const todayDate = today.toISOString().slice(0, 10)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysDate = in7Days.toISOString().slice(0, 10)

  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: totalClients },
    { data: leadsRaw },
    { data: recentProjectsRaw },
    { data: recentLeadsRaw },
    { count: totalPortfolioVideos },
    { data: deliverablesRaw },
    { data: newLeadsRaw },
    { count: newLeadsCount },
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
    supabase
      .from('project_deliverables')
      .select('id, title, due_date, status, project:projects(id, title)')
      .gte('due_date', todayDate)
      .lte('due_date', in7DaysDate)
      .neq('status', 'approved')
      .order('due_date', { ascending: true })
      .limit(8),
    supabase
      .from('leads')
      .select('id, name, email, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
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

  const upcomingDeliverables: UpcomingDeliverable[] = (deliverablesRaw ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    due_date: d.due_date as string,
    status: d.status as DeliverableStatus,
    project: Array.isArray(d.project)
      ? (d.project[0] ?? null)
      : (d.project as { id: string; title: string } | null),
  }))

  const newLeads: NewLead[] = (newLeadsRaw ?? []) as NewLead[]
  const totalNewLeads = newLeadsCount ?? 0

  // ── Stats cards definition ─────────────────────────────────────────────────
  const statCards = [
    {
      label: 'PROYECTOS ACTIVOS',
      sublabel: 'en produccion',
      value: activeProjects ?? 0,
      icon: FolderKanban,
      accent: STAT_ACCENT[0],
    },
    {
      label: 'CLIENTES',
      sublabel: `${totalProjects ?? 0} proyectos totales`,
      value: totalClients ?? 0,
      icon: Users,
      accent: STAT_ACCENT[1],
    },
    {
      label: 'LEADS ACTIVOS',
      sublabel: `${totalLeads} en total`,
      value: activeLeads,
      icon: Target,
      accent: STAT_ACCENT[2],
    },
    {
      label: 'LEADS GANADOS',
      sublabel: `${leadsByStatus.lost} perdidos`,
      value: leadsByStatus.won,
      icon: CheckCircle2,
      accent: STAT_ACCENT[3],
    },
    {
      label: 'VIDEOS PORTFOLIO',
      sublabel: 'visibles',
      value: totalPortfolioVideos ?? 0,
      icon: Film,
      accent: STAT_ACCENT[4],
    },
  ] as const

  const quickLinks = [
    { label: 'Portfolio', href: '/admin/portfolio' },
    { label: 'Proyectos', href: '/admin/projects' },
    { label: 'Kanban', href: '/admin/kanban' },
    { label: 'Clientes', href: '/admin/clients' },
    { label: 'Leads', href: '/admin/leads' },
    { label: 'Equipo', href: '/admin/team' },
  ] as const

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .apd-root {
          background-color: #000000;
          min-height: 100vh;
          padding: 2.5rem 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          color: #F5F5F7;
          box-sizing: border-box;
        }
        .apd-stat-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.2s;
        }
        .apd-stat-card:hover {
          border-color: rgba(255,255,255,0.14);
        }
        .apd-list-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }
        .apd-list-item {
          transition: background 0.15s;
        }
        .apd-list-item:hover {
          background: rgba(255,255,255,0.04);
        }
        .apd-quick-link {
          display: inline-block;
          padding: 7px 18px;
          background: #1C1C1E;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          color: #86868B;
          font-size: 12px;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          letter-spacing: 0.01em;
        }
        .apd-quick-link:hover {
          background: #2C2C2E;
          color: #F5F5F7;
        }
        .apd-ver-todos {
          color: #0071E3;
          font-size: 13px;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .apd-ver-todos:hover {
          opacity: 0.75;
        }
        .apd-project-link {
          color: #F5F5F7;
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: color 0.15s;
        }
        .apd-project-link:hover {
          color: #0071E3;
        }
        .dh-row:hover {
          background: #1C1C1E;
        }
        .dh-link:hover {
          color: #0071E3;
        }
        .dh-action-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          background: #0071E3;
          border-radius: 10px;
          color: #F5F5F7;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: opacity 0.15s;
          flex: 1;
        }
        .dh-action-primary:hover {
          opacity: 0.85;
        }
        .dh-action-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          background: #1C1C1E;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #F5F5F7;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s;
          flex: 1;
        }
        .dh-action-secondary:hover {
          background: #2C2C2E;
        }
      `}</style>

      <div className="apd-root">

        {/* ── Header ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#F5F5F7',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {greetingLabel()}, Emi
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#86868B',
              margin: 0,
              textTransform: 'capitalize',
            }}
          >
            {todayLabel()}
          </p>
        </div>

        {/* ── Stat cards row ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          {statCards.map(({ label, sublabel, value, icon: Icon, accent }) => (
            <div key={label} className="apd-stat-card">
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${accent}1A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={accent} strokeWidth={1.8} />
              </div>
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#F5F5F7',
                  margin: 0,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {value}
              </p>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#86868B',
                    margin: '0 0 2px 0',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#48484A',
                    margin: 0,
                  }}
                >
                  {sublabel}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Entregas + Leads sin atender (2 cols) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* ── Entregas esta semana ── */}
          <div
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#F5F5F7',
                margin: '0 0 16px 0',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                Entregas esta semana
                {upcomingDeliverables.length > 0 && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: upcomingDeliverables.length >= 3 ? '#FF453A' : '#FF9F0A',
                      background: upcomingDeliverables.length >= 3
                        ? 'rgba(255,69,58,0.13)'
                        : 'rgba(255,159,10,0.13)',
                      borderRadius: '6px',
                      padding: '2px 7px',
                    }}
                  >
                    {upcomingDeliverables.length}
                  </span>
                )}
              </span>
            </p>

            {upcomingDeliverables.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#86868B', margin: 0 }}>
                Sin entregas pendientes esta semana
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {upcomingDeliverables.map((deliverable) => {
                  const days = daysUntil(deliverable.due_date)
                  const daysColor = days < 3 ? '#FF453A' : days < 5 ? '#FF9F0A' : '#30D158'
                  return (
                    <Link
                      key={deliverable.id}
                      href={deliverable.project ? `/admin/projects/${deliverable.project.id}` : '/admin/projects'}
                      className="dh-row dh-link"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '13px',
                            color: '#F5F5F7',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {deliverable.title}
                        </span>
                        {deliverable.project && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#48484A',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '2px',
                            }}
                          >
                            {deliverable.project.title}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: daysColor,
                            minWidth: '20px',
                            textAlign: 'right',
                          }}
                        >
                          {days}d
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: DELIVERABLE_STATUS_COLOR[deliverable.status],
                            background: DELIVERABLE_STATUS_BG[deliverable.status],
                            borderRadius: '6px',
                            padding: '3px 8px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {DELIVERABLE_STATUS_LABEL[deliverable.status]}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Leads sin atender ── */}
          <div
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#F5F5F7',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
              }}
            >
              Leads sin atender
              {totalNewLeads > 0 && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0071E3',
                    background: 'rgba(0,113,227,0.13)',
                    borderRadius: '6px',
                    padding: '2px 7px',
                  }}
                >
                  {totalNewLeads}
                </span>
              )}
            </p>

            {newLeads.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#30D158', margin: 0 }}>
                Todos los leads atendidos
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {newLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href="/admin/leads"
                    className="dh-row dh-link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: '13px',
                          color: '#F5F5F7',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lead.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#48484A',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}
                      >
                        {lead.email}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#86868B',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(lead.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Acciones rapidas ── */}
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '28px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#86868B',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 14px 0',
            }}
          >
            Acciones rapidas
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/admin/projects/new" className="dh-action-primary">
              + Nuevo proyecto
            </Link>
            <Link href="/admin/leads?showAdd=1" className="dh-action-secondary">
              + Nuevo lead
            </Link>
            <Link href="/admin/clients" className="dh-action-secondary">
              + Nuevo cliente
            </Link>
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {/* ── Proyectos recientes ── */}
          <div className="apd-list-card">
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                }}
              >
                Proyectos recientes
              </span>
              <Link href="/admin/projects" className="apd-ver-todos">
                Ver todos
              </Link>
            </div>

            {/* Items */}
            {recentProjects.length === 0 && (
              <p
                style={{
                  color: '#48484A',
                  fontSize: '13px',
                  padding: '20px',
                  margin: 0,
                }}
              >
                Sin proyectos registrados.
              </p>
            )}

            {recentProjects.map((project, idx) => (
              <div
                key={project.id}
                className="apd-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 20px',
                  borderBottom:
                    idx < recentProjects.length - 1
                      ? '1px solid rgba(255,255,255,0.05)'
                      : 'none',
                }}
              >
                {/* Left: name + client */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="apd-project-link"
                    style={{ display: 'block' }}
                  >
                    {project.title}
                  </Link>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#48484A',
                      display: 'block',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.client?.name ?? 'Sin cliente'}
                  </span>
                </div>

                {/* Right: status pill + date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: PROJECT_STATUS_COLOR[project.status],
                      background: PROJECT_STATUS_BG[project.status],
                      borderRadius: '6px',
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {PROJECT_STATUS_LABEL[project.status]}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#48484A',
                      whiteSpace: 'nowrap',
                      minWidth: '46px',
                      textAlign: 'right',
                    }}
                  >
                    {formatDate(project.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Leads recientes ── */}
          <div className="apd-list-card">
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                }}
              >
                Leads recientes
              </span>
              <Link href="/admin/leads" className="apd-ver-todos">
                Ver pipeline
              </Link>
            </div>

            {/* Items */}
            {recentLeads.length === 0 && (
              <p
                style={{
                  color: '#48484A',
                  fontSize: '13px',
                  padding: '20px',
                  margin: 0,
                }}
              >
                Sin leads registrados.
              </p>
            )}

            {recentLeads.map((lead, idx) => (
              <div
                key={lead.id}
                className="apd-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 20px',
                  borderBottom:
                    idx < recentLeads.length - 1
                      ? '1px solid rgba(255,255,255,0.05)'
                      : 'none',
                }}
              >
                {/* Left: name + source */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link
                    href="/admin/leads"
                    className="apd-project-link"
                    style={{ display: 'block' }}
                  >
                    {lead.name}
                  </Link>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#48484A',
                      display: 'block',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lead.source}
                  </span>
                </div>

                {/* Right: status badge + date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: LEAD_STATUS_COLOR[lead.status],
                      background: LEAD_STATUS_BG[lead.status],
                      borderRadius: '6px',
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {LEAD_STATUS_LABEL[lead.status]}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#48484A',
                      whiteSpace: 'nowrap',
                      minWidth: '46px',
                      textAlign: 'right',
                    }}
                  >
                    {formatDate(lead.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Accesos rapidos ── */}
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#48484A',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 12px 0',
            }}
          >
            Accesos rapidos
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="apd-quick-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
