import Link from 'next/link'
import {
  FolderKanban,
  Users,
  Target,
  CheckCircle2,
  Film,
  Plus,
  UserPlus,
  UserCheck,
  TrendingUp,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus, LeadStatus, LeadSource, DeliverableStatus } from '@/lib/supabase/types'
import { StatCardsGrid } from '@/components/admin/dashboard/StatCardsGrid'
import type { StatCardData } from '@/components/admin/dashboard/StatCardsGrid'
import { AgendaWidget } from '@/components/admin/dashboard/AgendaWidget'
import type { AgendaEvent } from '@/components/admin/dashboard/AgendaWidget'
import { FadeIn } from '@/components/admin/dashboard/FadeIn'
import { AnimatedProjectsList } from '@/components/admin/dashboard/AnimatedProjectsList'
import type { ProjectRow } from '@/components/admin/dashboard/AnimatedProjectsList'
import { AnimatedLeadsList } from '@/components/admin/dashboard/AnimatedLeadsList'
import type { LeadRow } from '@/components/admin/dashboard/AnimatedLeadsList'
import { HoverLiftLink } from '@/components/admin/dashboard/HoverLiftLink'

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

interface AtRiskProject {
  id: string
  title: string
  end_date: string
  status: ProjectStatus
  client_id: string | null
}

interface DeliveredProjectForSparkline {
  end_date: string | null
}

interface TodayTask {
  id: string
  title: string
  project_title: string | null
  project_id: string | null
}

// Period values used by the sparkline/revenue chart
type SparklinePeriod = 'this_month' | '3months' | 'this_year' | 'all_time'

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
  if (diffDays === 1) return 'hace 1 día'
  return `hace ${diffDays} días`
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
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

// Build sparkline data from delivered projects grouped by end_date month,
// filtered to the selected period.
function buildSparklinePoints(
  projects: DeliveredProjectForSparkline[],
  period: SparklinePeriod
): number[] {
  const now = new Date()

  // Determine how many months back to include and bucket count
  let monthCount: number
  switch (period) {
    case 'this_month':
      monthCount = 1
      break
    case '3months':
      monthCount = 3
      break
    case 'this_year':
      // months from Jan of current year to now
      monthCount = now.getMonth() + 1
      break
    case 'all_time':
    default:
      monthCount = 12
      break
  }

  // Clamp to at least 2 so the polyline has something to draw
  const buckets = Math.max(monthCount, 2)
  const counts: number[] = new Array(buckets).fill(0) as number[]

  for (const p of projects) {
    if (!p.end_date) continue
    const d = new Date(p.end_date)
    const monthsDiff =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    if (monthsDiff >= 0 && monthsDiff < buckets) {
      counts[buckets - 1 - monthsDiff]++
    }
  }
  return counts
}

// Format a currency amount: sum across mixed currencies — use the dominant currency
// or fall back to a plain number. For the dashboard we sum all paid invoices and
// show the total in MXN (the studio's primary currency).
function formatRevenue(total: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(total)
  } catch {
    return `$${total.toLocaleString('es-MX')} ${currency}`
  }
}

// Get the ISO date string N days ago (for stale leads check)
function daysAgoIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

// Render a tiny 80x24 SVG polyline from an array of 5 values
function SparklineSVG({ values, color }: { values: number[]; color: string }) {
  const w = 80
  const h = 24
  const max = Math.max(...values, 1)
  const divisor = values.length > 1 ? values.length - 1 : 1
  const pts = values
    .map((v, i) => {
      const x = (i / divisor) * w
      const y = h - (v / max) * (h - 2) - 1
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  pre_production: 'Pre-prod',
  production: 'Producción',
  post_production: 'Post-prod',
  delivered: 'Entregado',
}

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  pre_production: 'var(--dash-text-tertiary)',
  production: 'var(--dash-success)',
  post_production: 'var(--dash-warning)',
  delivered: 'var(--dash-accent)',
}

const PROJECT_STATUS_BG: Record<ProjectStatus, string> = {
  pre_production: 'rgba(72,72,74,0.18)',
  production: 'rgba(48,209,88,0.13)',
  post_production: 'rgba(255,159,10,0.13)',
  delivered: 'rgba(var(--dash-accent-rgb),0.13)',
}

const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'var(--dash-accent)',
  contacted: '#BF5AF2',
  qualified: 'var(--dash-warning)',
  proposal: '#FF6961',
  won: 'var(--dash-success)',
  lost: 'var(--dash-text-tertiary)',
}

const LEAD_STATUS_BG: Record<LeadStatus, string> = {
  new: 'rgba(var(--dash-accent-rgb),0.13)',
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
  pending: 'var(--dash-warning)',
  review: '#BF5AF2',
  approved: 'var(--dash-success)',
}

const DELIVERABLE_STATUS_BG: Record<DeliverableStatus, string> = {
  pending: 'rgba(255,159,10,0.13)',
  review: 'rgba(191,90,242,0.13)',
  approved: 'rgba(48,209,88,0.13)',
}

const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  pending: 'Pendiente',
  review: 'En revisión',
  approved: 'Aprobado',
}

// ─── Stat card accent colours (icon + number tint) ───────────────────────────

const STAT_ACCENT = ['var(--dash-accent)', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A'] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const supabase = createServiceClient()
  const resolvedParams = await searchParams
  const rawPeriod = typeof resolvedParams.period === 'string' ? resolvedParams.period : 'all_time'
  const VALID_PERIODS: SparklinePeriod[] = ['this_month', '3months', 'this_year', 'all_time']
  const period: SparklinePeriod = VALID_PERIODS.includes(rawPeriod as SparklinePeriod)
    ? (rawPeriod as SparklinePeriod)
    : 'all_time'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // project_deliverables.due_date is a date column (YYYY-MM-DD), so compare as date string
  const todayDate = today.toISOString().slice(0, 10)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysDate = in7Days.toISOString().slice(0, 10)

  // Compute sparkline cutoff date based on selected period
  const sparklineCutoff = new Date(today)
  switch (period) {
    case 'this_month':
      sparklineCutoff.setDate(1)
      break
    case '3months':
      sparklineCutoff.setMonth(sparklineCutoff.getMonth() - 2)
      sparklineCutoff.setDate(1)
      break
    case 'this_year':
      sparklineCutoff.setMonth(0)
      sparklineCutoff.setDate(1)
      break
    case 'all_time':
    default:
      sparklineCutoff.setFullYear(sparklineCutoff.getFullYear() - 1)
      sparklineCutoff.setDate(1)
      break
  }

  // Date threshold for stale leads (more than 3 days in 'new' status)
  const staleLeadsThreshold = daysAgoIso(3)

  // Supabase client cast for tables not in our typed schema (invoices)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = supabase as unknown as { from: (table: string) => any }

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
    { data: atRiskRaw },
    { data: deliveredProjectsRaw },
    { data: invoicesPaidRaw },
    { data: tasksDueTodayRaw },
    { count: staleLeadsCount },
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
    // Projects in risk: end_date within next 5 days and not delivered
    supabase
      .from('projects')
      .select('id, title, end_date, status, client_id')
      .neq('status', 'delivered')
      .lte('end_date', new Date(today.getTime() + 5 * 86400000).toISOString())
      .order('end_date', { ascending: true })
      .limit(3),
    // Delivered projects filtered by selected period for sparkline
    supabase
      .from('projects')
      .select('end_date')
      .eq('status', 'delivered')
      .gte('end_date', sparklineCutoff.toISOString().slice(0, 10)),
    // Paid invoices for Revenue Total (invoices table not in typed schema)
    dbAny.from('invoices').select('amount, currency').eq('status', 'paid') as Promise<{ data: { amount: number; currency: string }[] | null }>,
    // Tasks due today — joined with task_boards to get project info
    supabase
      .from('tasks')
      .select('id, title, board:task_boards(project_id, project:projects(title))')
      .eq('due_date', todayDate)
      .limit(10),
    // Stale new leads: 'new' status created more than 3 days ago
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .lt('created_at', staleLeadsThreshold),
  ])

  // Agenda operativa: próximos eventos (grabaciones, cobros, entregas) pendientes.
  const agendaTodayIso = new Date().toISOString().split('T')[0]
  const { data: agendaRaw } = await dbAny
    .from('calendar_events')
    .select('id, title, type, event_date, event_time, projects(title), clients(name)')
    .eq('status', 'pendiente')
    .gte('event_date', agendaTodayIso)
    .order('event_date', { ascending: true })
    .limit(6)
  const agendaEvents: AgendaEvent[] = ((agendaRaw ?? []) as Array<{
    id: string
    title: string
    type: string
    event_date: string
    event_time: string | null
    projects: { title: string } | null
    clients: { name: string } | null
  }>).map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    event_date: e.event_date,
    event_time: e.event_time,
    project_title: e.projects?.title ?? null,
    client_name: e.clients?.name ?? null,
  }))

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

  // At-risk projects
  const atRiskProjects: AtRiskProject[] = (atRiskRaw ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    end_date: p.end_date as string,
    status: p.status as ProjectStatus,
    client_id: p.client_id as string | null,
  }))

  // Sparkline data — filtered by selected period
  const sparklineValues = buildSparklinePoints(
    (deliveredProjectsRaw ?? []) as DeliveredProjectForSparkline[],
    period
  )
  const sparklineAccent = STAT_ACCENT[0]

  // Revenue Total — sum of all paid invoices, displayed in MXN
  const paidInvoices = (invoicesPaidRaw ?? []) as { amount: number; currency: string }[]
  const revenueTotal = paidInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0)
  const revenueCurrency = paidInvoices.find((i) => i.currency)?.currency ?? 'MXN'
  const revenueDisplay = revenueTotal > 0 ? formatRevenue(revenueTotal, revenueCurrency) : '$0 MXN'

  // Stale leads count
  const staleLeads = staleLeadsCount ?? 0

  // Today's tasks
  const todayTasks: TodayTask[] = (tasksDueTodayRaw ?? []).map((t) => {
    // board may be an array or object depending on Supabase join mode
    const boardRaw = Array.isArray(t.board) ? t.board[0] : t.board
    const projectRaw = boardRaw?.project
    const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw
    return {
      id: t.id as string,
      title: t.title as string,
      project_title: (project?.title as string | null) ?? null,
      project_id: (boardRaw?.project_id as string | null) ?? null,
    }
  })

  // ── Serialised rows for animated client list components ───────────────────
  const projectRows: ProjectRow[] = recentProjects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    created_at: p.created_at,
    clientName: p.client?.name ?? null,
    statusLabel: PROJECT_STATUS_LABEL[p.status],
    statusColor: PROJECT_STATUS_COLOR[p.status],
    statusBg: PROJECT_STATUS_BG[p.status],
    formattedDate: formatDate(p.created_at),
  }))

  const leadRows: LeadRow[] = recentLeads.map((l) => ({
    id: l.id,
    name: l.name,
    source: l.source,
    created_at: l.created_at,
    statusLabel: LEAD_STATUS_LABEL[l.status],
    statusColor: LEAD_STATUS_COLOR[l.status],
    statusBg: LEAD_STATUS_BG[l.status],
    formattedDate: formatDate(l.created_at),
  }))

  // ── Stats cards definition ─────────────────────────────────────────────────
  const statCards = [
    {
      label: 'PROYECTOS ACTIVOS',
      sublabel: 'en produccion',
      value: activeProjects ?? 0,
      icon: FolderKanban,
      accent: STAT_ACCENT[0],
      href: '/admin/projects?status=active',
    },
    {
      label: 'CLIENTES',
      sublabel: `${totalProjects ?? 0} proyectos totales`,
      value: totalClients ?? 0,
      icon: Users,
      accent: STAT_ACCENT[1],
      href: '/admin/clients',
    },
    {
      label: 'LEADS ACTIVOS',
      sublabel: `${totalLeads} en total`,
      value: activeLeads,
      icon: Target,
      accent: STAT_ACCENT[2],
      href: '/admin/leads',
    },
    {
      label: 'LEADS GANADOS',
      sublabel: `${leadsByStatus.lost} perdidos`,
      value: leadsByStatus.won,
      icon: CheckCircle2,
      accent: STAT_ACCENT[3],
      href: '/admin/leads',
    },
    {
      label: 'VIDEOS PORTFOLIO',
      sublabel: 'visibles',
      value: totalPortfolioVideos ?? 0,
      icon: Film,
      accent: STAT_ACCENT[4],
      href: '/admin/portfolio',
    },
  ] as const

  // Serializable version for the animated client component (6 cards: 5 original + revenue)
  const statCardData: StatCardData[] = [
    { label: statCards[0].label, sublabel: statCards[0].sublabel, value: statCards[0].value, iconKey: 'FolderKanban', accent: statCards[0].accent, href: statCards[0].href },
    { label: statCards[1].label, sublabel: statCards[1].sublabel, value: statCards[1].value, iconKey: 'Users',        accent: statCards[1].accent, href: statCards[1].href },
    { label: statCards[2].label, sublabel: statCards[2].sublabel, value: statCards[2].value, iconKey: 'Target',       accent: statCards[2].accent, href: statCards[2].href },
    { label: statCards[3].label, sublabel: statCards[3].sublabel, value: statCards[3].value, iconKey: 'CheckCircle2', accent: statCards[3].accent, href: statCards[3].href },
    { label: statCards[4].label, sublabel: statCards[4].sublabel, value: statCards[4].value, iconKey: 'Film',         accent: statCards[4].accent, href: statCards[4].href },
    {
      label: 'REVENUE TOTAL',
      sublabel: `${paidInvoices.length} facturas pagadas`,
      value: revenueTotal,
      displayValue: revenueDisplay,
      iconKey: 'DollarSign',
      accent: '#30D158',
      href: '/admin/invoices',
    },
  ]

  const quickActions = [
    {
      label: 'Nuevo proyecto',
      href: '/admin/projects/new',
      icon: Plus,
      variant: 'primary' as const,
    },
    {
      label: 'Nuevo lead',
      href: '/admin/leads?showAdd=1',
      icon: UserPlus,
      variant: 'secondary' as const,
    },
    {
      label: 'Nuevo cliente',
      href: '/admin/clients',
      icon: UserCheck,
      variant: 'secondary' as const,
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
          background-color: var(--dash-bg);
          min-height: 100vh;
          padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem);
          font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          color: var(--dash-text-primary);
          box-sizing: border-box;
        }
        /* ── Hero cinematográfico ── */
        .apd-hero {
          position: relative;
          isolation: isolate;
          margin-bottom: 2.75rem;
          padding: 6px 0 26px;
        }
        .apd-hero-bg {
          position: absolute;
          inset: -60px -12% -10px -12%;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .apd-hero-bg::before {
          content: '';
          position: absolute;
          top: -140px; left: 4%;
          width: min(560px, 70%); height: 360px;
          background: radial-gradient(circle at 30% 35%, color-mix(in srgb, var(--dash-accent) 32%, transparent), transparent 64%);
          filter: blur(18px);
          opacity: 0.55;
        }
        .apd-hero-bg::after {
          content: '';
          position: absolute; inset: 0;
          opacity: 0.4;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .apd-hero > * { position: relative; z-index: 1; }
        .apd-hero-kicker {
          font-family: var(--dash-font-mono);
          font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase;
          color: var(--dash-text-secondary);
          margin: 0 0 16px; display: inline-flex; align-items: center; gap: 11px;
        }
        .apd-hero-kicker::before {
          content: ''; width: 26px; height: 1px; background: var(--dash-accent);
        }
        .apd-hero-title {
          font-family: var(--dash-font-display);
          font-optical-sizing: auto;
          font-weight: 600;
          font-size: clamp(2.4rem, 6vw, 4.1rem);
          line-height: 0.96; letter-spacing: -0.022em;
          color: var(--dash-text-primary); margin: 0;
        }
        .apd-hero-title em { font-style: italic; font-weight: 500; color: var(--dash-accent); }
        .apd-hero-meta {
          font-family: var(--dash-font-mono);
          font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--dash-text-secondary);
          margin: 20px 0 0; display: flex; gap: 16px; flex-wrap: wrap; align-items: center;
        }
        .apd-hero-meta .dot { width: 4px; height: 4px; border-radius: 4px; background: var(--dash-text-tertiary); }
        .apd-hero-rule {
          height: 1px; margin-top: 22px;
          background: linear-gradient(90deg, var(--dash-border-strong), transparent 80%);
        }
        /* ── Stat cards estilo "claqueta" ── */
        .apd-stat-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, var(--dash-surface-2), var(--dash-surface-1) 70%);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          padding: 22px 22px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          box-shadow: var(--dash-shadow-sm), var(--dash-highlight);
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
        }
        .apd-stat-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--card-accent, var(--dash-accent)), transparent 72%);
          opacity: 0.9;
        }
        .apd-stat-card::after {
          content: '';
          position: absolute; inset: 0; opacity: 0; pointer-events: none;
          transition: opacity 0.25s;
          background: radial-gradient(130% 90% at 0% 0%, color-mix(in srgb, var(--card-accent, var(--dash-accent)) 15%, transparent), transparent 55%);
        }
        .apd-stat-card:hover {
          border-color: color-mix(in srgb, var(--card-accent, var(--dash-accent)) 50%, var(--dash-border-strong)) !important;
          transform: translateY(-3px);
          box-shadow: var(--dash-shadow-lg), var(--dash-highlight-strong);
        }
        .apd-stat-card:hover::after { opacity: 1; }
        .apd-list-card {
          background: var(--dash-surface-1);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--dash-shadow-sm), var(--dash-highlight);
        }
        .apd-list-item {
          transition: background 0.15s;
        }
        .apd-list-item:hover {
          background: var(--dash-surface-2);
        }
        .apd-quick-link {
          display: inline-block;
          padding: 7px 18px;
          background: var(--dash-surface-2);
          border: 1px solid var(--dash-border);
          border-radius: 20px;
          color: var(--dash-text-secondary);
          font-size: 12px;
          text-decoration: none;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
          letter-spacing: 0.01em;
          box-shadow: var(--dash-highlight);
        }
        .apd-quick-link:hover {
          background: var(--dash-surface-3);
          color: var(--dash-text-primary);
          box-shadow: var(--dash-shadow-xs), var(--dash-highlight);
        }
        .apd-ver-todos {
          color: var(--dash-accent);
          font-size: 13px;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .apd-ver-todos:hover {
          opacity: 0.75;
        }
        .apd-project-link {
          color: var(--dash-text-primary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: color 0.15s;
        }
        .apd-project-link:hover {
          color: var(--dash-accent);
        }
        .dh-row:hover {
          background: var(--dash-surface-2);
        }
        .dh-link:hover {
          color: var(--dash-accent);
        }
        .dh-action-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--dash-accent);
          background-image: linear-gradient(180deg, color-mix(in srgb, var(--dash-accent) 80%, white) 0%, var(--dash-accent) 100%);
          border-radius: 11px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          flex: 1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .dh-action-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .dh-action-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--dash-surface-2);
          border: 1px solid var(--dash-border);
          border-radius: 11px;
          color: var(--dash-text-primary);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
          flex: 1;
          box-shadow: var(--dash-highlight);
        }
        .dh-action-secondary:hover {
          background: var(--dash-surface-3);
          border-color: var(--dash-border-strong);
          transform: translateY(-1px);
          box-shadow: var(--dash-shadow-xs), var(--dash-highlight);
        }
        .apd-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 640px) {
          .apd-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        /* Alert icon for at-risk projects — CSS triangle, no emoji */
        .apd-alert-icon {
          display: inline-block;
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 12px solid currentColor;
          flex-shrink: 0;
          position: relative;
          top: 1px;
        }
        .apd-alert-icon::after {
          content: '';
          position: absolute;
          width: 2px;
          height: 5px;
          background: var(--dash-surface-1);
          left: -1px;
          top: 3px;
          border-radius: 1px;
        }
      `}</style>

      <div className="apd-root">

        {/* ── Hero cinematográfico ── */}
        <header className="apd-hero">
          <div className="apd-hero-bg" aria-hidden="true" />
          <p className="apd-hero-kicker">XICO Films — Panel de control</p>
          <h1 className="apd-hero-title">
            {greetingLabel()}, <em>Emi</em>
          </h1>
          <div className="apd-hero-meta">
            <span style={{ textTransform: 'capitalize' }}>{todayLabel()}</span>
            <span className="dot" />
            <span>{activeProjects ?? 0} en producción</span>
            <span className="dot" />
            <span>{agendaEvents.length} en agenda</span>
          </div>
          <div className="apd-hero-rule" />
        </header>

        {/* ── Stat cards row — animated client component ── */}
        <FadeIn delay={0}>
          <StatCardsGrid cards={statCardData} />
        </FadeIn>

        {/* Agenda operativa: próximos eventos del calendario */}
        <FadeIn delay={0.05}>
          <div style={{ marginTop: 20 }}>
            <AgendaWidget events={agendaEvents} />
          </div>
        </FadeIn>

        {/* ── Proyectos entregados sparkline card with period selector ── */}
        <FadeIn delay={0}>
        <div
          style={{
            background: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
          }}
        >
          {/* top row: icon+label | period buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: `${sparklineAccent}1A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={15} color={sparklineAccent} strokeWidth={1.8} />
              </div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--dash-text-secondary)',
                  margin: 0,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Proyectos entregados
              </p>
            </div>
            {/* Period filter links — server-side navigation, no client JS needed */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--dash-surface-2)',
                borderRadius: '10px',
                padding: '3px',
                border: '1px solid var(--dash-border)',
                flexShrink: 0,
              }}
            >
              {(
                [
                  { label: 'Mes', value: 'this_month' },
                  { label: '3M', value: '3months' },
                  { label: 'Año', value: 'this_year' },
                  { label: 'Todo', value: 'all_time' },
                ] as { label: string; value: SparklinePeriod }[]
              ).map((btn) => {
                const isActive = period === btn.value
                return (
                  <Link
                    key={btn.value}
                    href={`/admin?period=${btn.value}`}
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? 'var(--dash-accent)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--dash-text-secondary)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.4,
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {btn.label}
                  </Link>
                )
              })}
            </div>
          </div>
          {/* bottom row: count + sparkline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--dash-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {sparklineValues.reduce((a, b) => a + b, 0)}
            </span>
            <SparklineSVG values={sparklineValues} color={sparklineAccent} />
          </div>
        </div>
        </FadeIn>

        {/* ── Proyectos en riesgo ── */}
        {atRiskProjects.length > 0 && (
          <FadeIn delay={0.1}>
          <div
            style={{
              background: 'var(--dash-surface-1)',
              border: '1px solid rgba(255,69,58,0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '16px',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--dash-danger)',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                className="apd-alert-icon"
                style={{ color: 'var(--dash-danger)' }}
                aria-hidden="true"
              />
              Proyectos en riesgo
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {atRiskProjects.map((proj) => {
                const days = daysUntil(proj.end_date)
                const overdue = days < 0
                const daysColor = overdue ? 'var(--dash-danger)' : 'var(--dash-warning)'
                const daysLabel = overdue ? `${Math.abs(days)} días vencido` : `${days} días`
                return (
                  <HoverLiftLink
                    key={proj.id}
                    href={`/admin/projects/${proj.id}`}
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
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'var(--dash-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {proj.title}
                    </span>
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
                          fontSize: '11px',
                          fontWeight: 500,
                          color: PROJECT_STATUS_COLOR[proj.status],
                          background: PROJECT_STATUS_BG[proj.status],
                          borderRadius: '6px',
                          padding: '3px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {PROJECT_STATUS_LABEL[proj.status]}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: daysColor,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {daysLabel}
                      </span>
                    </div>
                  </HoverLiftLink>
                )
              })}
            </div>
          </div>
          </FadeIn>
        )}

        {/* ── Hoy: tareas con vencimiento hoy ── */}
        {todayTasks.length > 0 && (
          <FadeIn delay={0.15}>
          <div
            style={{
              background: 'var(--dash-surface-1)',
              border: '1px solid rgba(var(--dash-accent-rgb),0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '16px',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--dash-accent)',
                margin: '0 0 10px 0',
              }}
            >
              Hoy — {todayTasks.length} {todayTasks.length === 1 ? 'tarea' : 'tareas'} vencen hoy
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {todayTasks.map((task) => (
                <HoverLiftLink
                  key={task.id}
                  href={task.project_id ? `/admin/projects/${task.project_id}` : '/admin/kanban'}
                  className="dh-row dh-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {task.title}
                  </span>
                  {task.project_title && (
                    <span style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {task.project_title}
                    </span>
                  )}
                </HoverLiftLink>
              ))}
            </div>
          </div>
          </FadeIn>
        )}

        {/* ── Entregas + Leads sin atender (2 cols) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* ── Entregas esta semana ── */}
          <FadeIn delay={0.2}>
          <div
            style={{
              background: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
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
                      color: upcomingDeliverables.length >= 3 ? 'var(--dash-danger)' : 'var(--dash-warning)',
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
              <p style={{ fontSize: '13px', color: 'var(--dash-text-secondary)', margin: 0 }}>
                Sin entregas pendientes esta semana
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {upcomingDeliverables.map((deliverable) => {
                  const days = daysUntil(deliverable.due_date)
                  const daysColor = days < 3 ? 'var(--dash-danger)' : days < 5 ? 'var(--dash-warning)' : 'var(--dash-success)'
                  return (
                    <HoverLiftLink
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
                            color: 'var(--dash-text-primary)',
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
                              color: 'var(--dash-text-tertiary)',
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
                    </HoverLiftLink>
                  )
                })}
              </div>
            )}
          </div>
          </FadeIn>

          {/* ── Leads sin atender ── */}
          <FadeIn delay={0.35}>
          <div
            style={{
              background: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--dash-text-primary)',
                  margin: '0 0 6px 0',
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
                      color: 'var(--dash-accent)',
                      background: 'rgba(var(--dash-accent-rgb),0.13)',
                      borderRadius: '6px',
                      padding: '2px 7px',
                    }}
                  >
                    {totalNewLeads}
                  </span>
                )}
              </p>
              {staleLeads > 0 && (
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--dash-warning)',
                    margin: 0,
                  }}
                >
                  {staleLeads} {staleLeads === 1 ? 'lead' : 'leads'} sin contactar por +3 días
                </p>
              )}
            </div>

            {newLeads.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--dash-success)', margin: 0 }}>
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
                          color: 'var(--dash-text-primary)',
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
                          color: 'var(--dash-text-tertiary)',
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
                        color: 'var(--dash-text-secondary)',
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
          </FadeIn>
        </div>

        {/* ── Acciones rápidas ── */}
        <div
          style={{
            background: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '28px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--dash-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 14px 0',
            }}
          >
            Acciones rápidas
          </p>
          <div className="apd-actions-grid">
            {quickActions.map(({ label, href, icon: ActionIcon, variant }) => (
              <Link
                key={href}
                href={href}
                className={variant === 'primary' ? 'dh-action-primary' : 'dh-action-secondary'}
              >
                <ActionIcon size={15} strokeWidth={2} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {/* ── Proyectos recientes ── */}
          <FadeIn delay={0.25}>
          <div className="apd-list-card">
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 20px 14px',
                borderBottom: '1px solid var(--dash-border)',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--dash-text-primary)',
                }}
              >
                Proyectos recientes
              </span>
              <Link href="/admin/projects" className="apd-ver-todos">
                Ver todos
              </Link>
            </div>

            {/* Items — staggered animated list */}
            <AnimatedProjectsList projects={projectRows} />
          </div>
          </FadeIn>

          {/* ── Leads recientes ── */}
          <FadeIn delay={0.3}>
          <div className="apd-list-card">
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 20px 14px',
                borderBottom: '1px solid var(--dash-border)',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--dash-text-primary)',
                }}
              >
                Leads recientes
              </span>
              <Link href="/admin/leads" className="apd-ver-todos">
                Ver pipeline
              </Link>
            </div>

            {/* Items — staggered animated list */}
            <AnimatedLeadsList leads={leadRows} />
          </div>
          </FadeIn>
        </div>

        {/* ── Accesos rápidos ── */}
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--dash-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 12px 0',
            }}
          >
            Accesos rápidos
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
