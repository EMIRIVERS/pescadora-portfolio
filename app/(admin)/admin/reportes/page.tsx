import { createServiceClient } from '@/lib/supabase/server'
import type { LeadStatus, LeadSource, ProjectStatus } from '@/lib/supabase/types'
import PeriodSelector from './PeriodSelector'
import type { Period } from './PeriodSelector'
import ExportButton from './ExportButton'

// ─── Local types ─────────────────────────────────────────────────────────────

interface LeadRow {
  id: string
  status: LeadStatus
  source: LeadSource
  created_at: string
  updated_at: string
  budget_range: string | null
}

interface ProjectRow {
  id: string
  title: string
  status: ProjectStatus
  created_at: string
  client_id: string | null
  budget: number | null
  end_date: string | null
}

interface ClientRow {
  id: string
  name: string
  created_at: string
}

interface MonthBucket {
  year: number
  month: number
  label: string
}

// ─── Period config ────────────────────────────────────────────────────────────

function getPeriodBounds(
  period: Period,
  from?: string,
  to?: string,
): { start: string | null; end: string | null } {
  if (period === 'custom') {
    return {
      start: from ? new Date(from).toISOString() : null,
      end: to ? new Date(to + 'T23:59:59.999Z').toISOString() : null,
    }
  }
  const now = new Date()
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: null,
    }
  }
  if (period === '3months') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
      end: null,
    }
  }
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1).toISOString(),
      end: null,
    }
  }
  return { start: null, end: null }
}

// ─── Revenue chart bucketing ──────────────────────────────────────────────────

const MONTH_NAMES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

function getChartBuckets(
  period: Period,
  from?: string,
  to?: string,
): MonthBucket[] {
  const now = new Date()

  if (period === 'month') {
    return [{
      year: now.getFullYear(),
      month: now.getMonth(),
      label: MONTH_NAMES_ES[now.getMonth()],
    }]
  }
  if (period === '3months') {
    const buckets: MonthBucket[] = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES_ES[d.getMonth()] })
    }
    return buckets
  }
  if (period === 'year') {
    return Array.from({ length: 12 }, (_, m) => ({
      year: now.getFullYear(),
      month: m,
      label: MONTH_NAMES_ES[m],
    }))
  }
  if (period === 'custom' && from && to) {
    const start = new Date(from)
    const end = new Date(to)
    const buckets: MonthBucket[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      buckets.push({ year: cur.getFullYear(), month: cur.getMonth(), label: MONTH_NAMES_ES[cur.getMonth()] })
      cur.setMonth(cur.getMonth() + 1)
    }
    return buckets.slice(-12)
  }
  // all_time — last 6 months
  const buckets: MonthBucket[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES_ES[d.getMonth()] })
  }
  return buckets
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STATUS_FUNNEL: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
]

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  won: 'Ganado',
  lost: 'Perdido',
}

const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'var(--dash-accent)',
  contacted: '#BF5AF2',
  qualified: '#FF9F0A',
  proposal: '#FF6961',
  won: '#30D158',
  lost: 'var(--dash-text-tertiary)',
}

const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  instagram: 'Instagram',
  web: 'Web',
  whatsapp: 'WhatsApp',
  referral: 'Referido',
  manual: 'Manual',
  other: 'Otro',
}

const LEAD_SOURCE_COLOR: Record<LeadSource, string> = {
  instagram: '#BF5AF2',
  web: 'var(--dash-accent)',
  whatsapp: '#30D158',
  referral: '#FF9F0A',
  manual: '#FF6961',
  other: 'var(--dash-text-tertiary)',
}

const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'pre_production',
  'production',
  'post_production',
  'delivered',
]

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  pre_production: 'Pre-producción',
  production: 'Producción',
  post_production: 'Post-producción',
  delivered: 'Entregado',
}

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  pre_production: '#BF5AF2',
  production: '#30D158',
  post_production: '#FF9F0A',
  delivered: 'var(--dash-accent)',
}

const PROJECT_STATUS_BG: Record<ProjectStatus, string> = {
  pre_production: 'rgba(191,90,242,0.12)',
  production: 'rgba(48,209,88,0.12)',
  post_production: 'rgba(255,159,10,0.12)',
  delivered: 'rgba(var(--dash-accent-rgb),0.12)',
}

const LEAD_SOURCES: LeadSource[] = [
  'instagram',
  'web',
  'whatsapp',
  'referral',
  'manual',
  'other',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isInMonth(isoDate: string | null, year: number, month: number): boolean {
  if (!isoDate) return false
  const d = new Date(isoDate)
  return d.getFullYear() === year && d.getMonth() === month
}

function formatMXN(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMXNFull(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}

export default async function ReportesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawPeriod = params.period ?? 'all'
  const period: Period = (['month', '3months', 'year', 'all', 'custom'] as Period[]).includes(
    rawPeriod as Period,
  )
    ? (rawPeriod as Period)
    : 'all'
  const fromParam = params.from
  const toParam = params.to

  const supabase = createServiceClient()
  const { start: periodStart, end: periodEnd } = getPeriodBounds(period, fromParam, toParam)

  // ── Queries ──────────────────────────────────────────────────────────────

  // All leads in period
  let leadsQuery = supabase
    .from('leads')
    .select('id, status, source, created_at, updated_at, budget_range')
  if (periodStart) leadsQuery = leadsQuery.gte('created_at', periodStart)
  if (periodEnd) leadsQuery = leadsQuery.lte('created_at', periodEnd)
  const { data: allLeadsRaw } = await leadsQuery

  // All projects in period (for pipeline + status distribution)
  let projectsQuery = supabase
    .from('projects')
    .select('id, title, status, created_at, client_id, budget, end_date')
  if (periodStart) projectsQuery = projectsQuery.gte('created_at', periodStart)
  if (periodEnd) projectsQuery = projectsQuery.lte('created_at', periodEnd)
  const { data: allProjectsRaw } = await projectsQuery

  // Delivered projects in period (for revenue KPI)
  let deliveredQuery = supabase
    .from('projects')
    .select('id, title, status, budget, currency, client_id, created_at, end_date')
    .eq('status', 'delivered')
  if (periodStart) deliveredQuery = deliveredQuery.gte('created_at', periodStart)
  if (periodEnd) deliveredQuery = deliveredQuery.lte('created_at', periodEnd)
  const { data: deliveredRaw } = await deliveredQuery

  // Delivered projects for revenue chart — same period filter, bucketed by month
  let chartDeliveredQuery = supabase
    .from('projects')
    .select('id, budget, end_date, created_at, status')
    .eq('status', 'delivered')
  if (periodStart) chartDeliveredQuery = chartDeliveredQuery.gte('created_at', periodStart)
  if (periodEnd) chartDeliveredQuery = chartDeliveredQuery.lte('created_at', periodEnd)
  const { data: chartDeliveredRaw } = await chartDeliveredQuery

  // Clients — all, used for name mapping and top-clients table
  const { data: allClientsRaw } = await supabase
    .from('clients')
    .select('id, name, created_at')

  // All projects ever — for top-clients aggregation across all time
  const { data: allProjectsAllTimeRaw } = await supabase
    .from('projects')
    .select('id, client_id, budget')

  const allLeads: LeadRow[] = (allLeadsRaw ?? []) as unknown as LeadRow[]
  const allProjects: ProjectRow[] = (allProjectsRaw ?? []) as unknown as ProjectRow[]
  const deliveredProjects = (deliveredRaw ?? []) as unknown as ProjectRow[]
  const chartDelivered = (chartDeliveredRaw ?? []) as unknown as ProjectRow[]
  const clients: ClientRow[] = (allClientsRaw ?? []) as unknown as ClientRow[]
  const allProjectsAllTime = (allProjectsAllTimeRaw ?? []) as unknown as {
    id: string
    client_id: string | null
    budget: number | null
  }[]

  // ── KPI calculations ─────────────────────────────────────────────────────

  const totalRevenue = deliveredProjects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const completedCount = deliveredProjects.length
  const totalLeads = allLeads.length
  const wonLeadRows = allLeads.filter((l) => l.status === 'won')
  const wonLeads = wonLeadRows.length
  const lostLeads = allLeads.filter((l) => l.status === 'lost').length
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0
  const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0

  // Avg days to close: won leads updated_at minus created_at
  const avgDaysToClose =
    wonLeadRows.length > 0
      ? Math.round(
          wonLeadRows.reduce(
            (sum, l) => sum + daysBetween(l.created_at, l.updated_at),
            0,
          ) / wonLeadRows.length,
        )
      : null

  // ── Pipeline funnel ───────────────────────────────────────────────────────

  const leadsByStatus: Record<LeadStatus, number> = {
    new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0,
  }
  for (const lead of allLeads) {
    leadsByStatus[lead.status]++
  }
  const funnelMax = Math.max(leadsByStatus['new'], 1)

  // ── Revenue chart (period-filtered, bucketed by month) ───────────────────

  const chartBuckets = getChartBuckets(period, fromParam, toParam)
  const monthlyRevenue = chartBuckets.map((bucket) => {
    const revenue = chartDelivered
      .filter((p) => isInMonth(p.end_date ?? p.created_at, bucket.year, bucket.month))
      .reduce((s, p) => s + (p.budget ?? 0), 0)
    return { label: bucket.label, revenue }
  })
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1)

  // ── Projects by status ────────────────────────────────────────────────────

  const projectsByStatus: Record<ProjectStatus, number> = {
    pre_production: 0, production: 0, post_production: 0, delivered: 0,
  }
  for (const project of allProjects) {
    projectsByStatus[project.status]++
  }
  const totalProjects = Math.max(allProjects.length, 1)

  // ── Top 5 projects by budget ──────────────────────────────────────────────

  const clientMap = new Map<string, string>(clients.map((c) => [c.id, c.name]))

  const top5Projects = [...allProjects]
    .filter((p) => (p.budget ?? 0) > 0)
    .sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
    .slice(0, 5)

  const maxProjectBudget = Math.max(...top5Projects.map((p) => p.budget ?? 0), 1)

  // ── Top 5 clients by total project budget ────────────────────────────────

  interface ClientStat {
    clientId: string
    name: string
    projectCount: number
    totalBudget: number
  }

  const clientStatMap = new Map<string, ClientStat>()
  for (const project of allProjectsAllTime) {
    if (!project.client_id) continue
    const existing = clientStatMap.get(project.client_id)
    if (existing) {
      existing.projectCount++
      existing.totalBudget += project.budget ?? 0
    } else {
      clientStatMap.set(project.client_id, {
        clientId: project.client_id,
        name: clientMap.get(project.client_id) ?? 'Desconocido',
        projectCount: 1,
        totalBudget: project.budget ?? 0,
      })
    }
  }
  const top5Clients = Array.from(clientStatMap.values())
    .filter((c) => c.totalBudget > 0)
    .sort((a, b) => b.totalBudget - a.totalBudget)
    .slice(0, 5)

  const maxClientBudget = Math.max(...top5Clients.map((c) => c.totalBudget), 1)

  // ── Leads by source ───────────────────────────────────────────────────────

  const leadsBySource: Record<LeadSource, number> = {
    instagram: 0, web: 0, whatsapp: 0, referral: 0, manual: 0, other: 0,
  }
  for (const lead of allLeads) {
    leadsBySource[lead.source]++
  }
  const totalLeadsForSource = Math.max(allLeads.length, 1)

  type SourceWithData = { source: LeadSource; count: number; pct: number; color: string }
  const sourcesWithData: SourceWithData[] = LEAD_SOURCES
    .map((source) => ({
      source,
      count: leadsBySource[source],
      pct: Math.round((leadsBySource[source] / totalLeadsForSource) * 100),
      color: LEAD_SOURCE_COLOR[source],
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  let conicStops = ''
  let runningPct = 0
  for (const s of sourcesWithData) {
    conicStops += `${s.color} ${runningPct}% ${runningPct + s.pct}%, `
    runningPct += s.pct
  }
  if (runningPct < 100) {
    conicStops += `var(--dash-surface-3) ${runningPct}% 100%`
  } else {
    conicStops = conicStops.slice(0, -2)
  }
  const conicGradient =
    sourcesWithData.length > 0
      ? `conic-gradient(${conicStops})`
      : 'conic-gradient(var(--dash-surface-3) 0% 100%)'

  // ─────────────────────────────────────────────────────────────────────────

  const PERIOD_LABEL: Record<Period, string> = {
    month: 'Este mes',
    '3months': 'Últimos 3 meses',
    year: 'Este año',
    all: 'Todo el tiempo',
    custom:
      fromParam && toParam ? `${fromParam} — ${toParam}` : 'Rango personalizado',
  }

  return (
    <>
      <style>{`
        .rpt-root {
          background-color: var(--dash-bg);
          min-height: 100vh;
          padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem);
          font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          color: var(--dash-text-primary);
          box-sizing: border-box;
        }
        .rpt-card {
          background: var(--dash-surface-1);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          overflow: hidden;
        }
        .rpt-card-header {
          padding: 18px 20px 14px;
          border-bottom: 1px solid var(--dash-border);
        }
        .rpt-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--dash-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .rpt-card-subtitle {
          font-size: 12px;
          color: var(--dash-text-tertiary);
          margin: 3px 0 0 0;
        }
        .rpt-kpi-card {
          background: var(--dash-surface-1);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          padding: 22px 24px;
          transition: border-color 0.2s;
        }
        .rpt-kpi-card:hover { border-color: var(--dash-border-strong); }
        .rpt-table-row { transition: background 0.15s; }
        .rpt-table-row:hover { background: var(--dash-surface-2); }
        .rpt-bar-track {
          width: 100%;
          height: 5px;
          background: var(--dash-border);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 7px;
        }
        .rpt-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .rpt-col-bar {
          width: 100%;
          background: linear-gradient(180deg, var(--dash-accent-hover) 0%, var(--dash-accent) 100%);
          border-radius: 4px 4px 0 0;
          min-height: 3px;
          transition: height 0.4s ease;
          position: relative;
          cursor: default;
        }
        .rpt-col-bar:hover { background: linear-gradient(180deg, var(--dash-accent) 0%, var(--dash-accent-hover) 100%); }
        .rpt-col-label {
          font-size: 11px;
          color: var(--dash-text-tertiary);
          letter-spacing: 0.02em;
        }
        .rpt-funnel-bar {
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          transition: opacity 0.2s;
        }
        .rpt-funnel-bar:hover { opacity: 0.85; }
        .rpt-status-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          border-radius: 5px;
          padding: 2px 8px;
          letter-spacing: 0.04em;
        }
        .rpt-clients-row {
          display: grid;
          grid-template-columns: 2fr 80px 1fr 140px;
          padding: 12px 20px;
          align-items: center;
          border-bottom: 1px solid var(--dash-surface-2);
          transition: background 0.15s;
        }
        .rpt-clients-row:hover { background: var(--dash-surface-2); }
        .rpt-clients-row:last-child { border-bottom: none; }
      `}</style>

      <div className="rpt-root">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--dash-text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Reportes y Analytics
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              {PERIOD_LABEL[period]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
            <ExportButton period={period} from={fromParam} to={toParam} />
            <PeriodSelector currentPeriod={period} currentFrom={fromParam} currentTo={toParam} />
          </div>
        </div>

        {/* ── KPIs principales ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>

          {/* Revenue total */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(48,209,88,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-success)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Revenue Total
            </p>
            <p style={{ fontSize: totalRevenue >= 1_000_000 ? '26px' : '34px', fontWeight: 700, color: 'var(--dash-success)', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {formatMXNFull(totalRevenue)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              proyectos entregados
            </p>
          </div>

          {/* Proyectos completados */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(var(--dash-accent-rgb),0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Proyectos Completados
            </p>
            <p style={{ fontSize: '40px', fontWeight: 700, color: 'var(--dash-accent)', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {completedCount}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              {allProjects.length} en total (todos estados)
            </p>
          </div>

          {/* Tasa de conversion */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(255,159,10,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Tasa de Conversión
            </p>
            <p style={{ fontSize: '40px', fontWeight: 700, color: conversionRate > 0 ? 'var(--dash-success)' : 'var(--dash-text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {conversionRate.toFixed(1)}%
            </p>
            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              {wonLeads} ganados · {lostLeads} perdidos de {totalLeads}
            </p>
          </div>

          {/* Ticket promedio */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(191,90,242,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#BF5AF2', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Ticket Promedio
            </p>
            <p style={{ fontSize: avgTicket >= 1_000_000 ? '22px' : avgTicket >= 100_000 ? '26px' : '34px', fontWeight: 700, color: '#BF5AF2', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {completedCount > 0 ? formatMXNFull(avgTicket) : '—'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              por proyecto entregado
            </p>
          </div>

          {/* Tiempo promedio de cierre */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(255,105,97,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#FF6961', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Tiempo Prom. Cierre
            </p>
            <p style={{ fontSize: '40px', fontWeight: 700, color: '#FF6961', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {avgDaysToClose !== null ? avgDaysToClose : '—'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
              {avgDaysToClose !== null
                ? `días · ${wonLeadRows.length} leads ganados`
                : 'sin leads ganados'}
            </p>
          </div>
        </div>

        {/* ── Revenue por mes (bar chart) ───────────────────────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '20px' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Revenue por Mes</h2>
            <p className="rpt-card-subtitle">
              {period === 'all' ? 'Últimos 6 meses' : PERIOD_LABEL[period]} — proyectos entregados
            </p>
          </div>

          <div style={{ padding: '20px 20px 0' }}>
            {/* Y-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', paddingLeft: '4px' }}>
              {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                <span key={pct} style={{ fontSize: '10px', color: 'var(--dash-text-tertiary)' }}>
                  {formatMXN(maxRevenue * pct)}
                </span>
              ))}
            </div>
            {/* Gridlines + bars */}
            <div style={{ position: 'relative', height: '180px', paddingBottom: '28px' }}>
              <svg
                width="100%"
                height="152"
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                preserveAspectRatio="none"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                  <line
                    key={pct}
                    x1="0"
                    y1={`${(1 - pct) * 152}`}
                    x2="100%"
                    y2={`${(1 - pct) * 152}`}
                    stroke="var(--dash-border)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '152px', position: 'relative', zIndex: 1 }}>
                {monthlyRevenue.map((m) => {
                  const heightPct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
                  return (
                    <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%', justifyContent: 'flex-end' }}>
                      {m.revenue > 0 && (
                        <span style={{ fontSize: '9px', color: 'var(--dash-accent)', fontWeight: 600, marginBottom: '3px', letterSpacing: '-0.01em' }}>
                          {formatMXN(m.revenue)}
                        </span>
                      )}
                      <div
                        className="rpt-col-bar"
                        style={{ height: `${Math.max(heightPct, 1)}%`, width: '100%', minHeight: m.revenue > 0 ? '6px' : '2px', opacity: m.revenue > 0 ? 1 : 0.2 }}
                        title={`${m.label}: ${formatMXNFull(m.revenue)}`}
                      />
                    </div>
                  )
                })}
              </div>
              {/* X-axis labels */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {monthlyRevenue.map((m) => (
                  <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
                    <span className="rpt-col-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pipeline funnel + Fuentes de leads ───────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '16px', marginBottom: '20px' }}>

          {/* Pipeline funnel */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h2 className="rpt-card-title">Pipeline Funnel</h2>
              <p className="rpt-card-subtitle">
                Conversión entre etapas · {totalLeads} leads totales
              </p>
            </div>
            <div style={{ padding: '20px' }}>
              {LEAD_STATUS_FUNNEL.map((status, idx) => {
                const count = leadsByStatus[status]
                const widthPct = Math.max((count / funnelMax) * 100, 8)
                const nextStatus = LEAD_STATUS_FUNNEL[idx + 1]
                const nextCount = nextStatus !== undefined ? leadsByStatus[nextStatus] : null
                const convPct =
                  count > 0 && nextCount !== null
                    ? Math.round((nextCount / count) * 100)
                    : null
                // Percentage of total leads that reached this stage
                const stagePct =
                  totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0

                return (
                  <div key={status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: `${widthPct}%`, transition: 'width 0.4s ease' }}>
                      <div
                        className="rpt-funnel-bar"
                        style={{
                          background: `${LEAD_STATUS_COLOR[status]}22`,
                          border: `1px solid ${LEAD_STATUS_COLOR[status]}44`,
                          width: '100%',
                        }}
                        title={`${LEAD_STATUS_LABEL[status]}: ${count} leads (${stagePct}% del total)`}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 600, color: LEAD_STATUS_COLOR[status], flex: 1 }}>
                          {LEAD_STATUS_LABEL[status]}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dash-text-primary)', marginLeft: '8px' }}>
                          {count}
                        </span>
                        <span style={{ fontSize: '10px', color: LEAD_STATUS_COLOR[status], marginLeft: '6px', opacity: 0.85, minWidth: '32px', textAlign: 'right' }}>
                          {stagePct}%
                        </span>
                      </div>
                    </div>
                    {convPct !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '3px 0' }}>
                        <svg width="12" height="16" viewBox="0 0 12 16">
                          <path
                            d="M6 0 L6 10 M2 7 L6 13 L10 7"
                            stroke="var(--dash-text-tertiary)"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: convPct >= 60 ? 'var(--dash-success)' : convPct >= 30 ? 'var(--dash-warning)' : '#FF6961',
                        }}>
                          {convPct}% pasan
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Lost */}
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(72,72,74,0.15)', borderRadius: '8px', border: '1px solid rgba(72,72,74,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', fontWeight: 500 }}>
                  Perdidos
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)' }}>
                    {totalLeads > 0 ? Math.round((leadsByStatus['lost'] / totalLeads) * 100) : 0}% del total
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dash-text-tertiary)' }}>
                    {leadsByStatus['lost']}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fuentes de leads — donut */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h2 className="rpt-card-title">Fuentes de Leads</h2>
              <p className="rpt-card-subtitle">Distribución por canal de origen</p>
            </div>
            <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* Donut */}
              <div style={{ flexShrink: 0, position: 'relative', width: '120px', height: '120px' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: conicGradient,
                }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'var(--dash-surface-1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--dash-text-primary)', lineHeight: 1 }}>
                    {totalLeads}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--dash-text-tertiary)', marginTop: '2px' }}>
                    leads
                  </span>
                </div>
              </div>
              {/* Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(sourcesWithData.length > 0
                  ? sourcesWithData
                  : LEAD_SOURCES.map((s) => ({ source: s, count: 0, pct: 0, color: LEAD_SOURCE_COLOR[s] }))
                ).slice(0, 6).map((s) => (
                  <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--dash-text-secondary)', flex: 1 }}>
                      {LEAD_SOURCE_LABEL[s.source]}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: s.count > 0 ? 'var(--dash-text-primary)' : 'var(--dash-text-tertiary)' }}>
                      {s.count}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', width: '32px', textAlign: 'right' }}>
                      {s.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top 5 clientes por presupuesto total ─────────────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '20px' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Top 5 Clientes por Presupuesto</h2>
            <p className="rpt-card-subtitle">Suma de presupuestos de todos sus proyectos</p>
          </div>

          {top5Clients.length === 0 ? (
            <p style={{ color: 'var(--dash-text-tertiary)', fontSize: '13px', padding: '24px 20px', margin: 0 }}>
              Sin datos de presupuesto por cliente.
            </p>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 1fr 140px', padding: '8px 20px', borderBottom: '1px solid var(--dash-border)' }}>
                {['Cliente', 'Proyectos', 'Porcentaje', 'Presupuesto Total'].map((col) => (
                  <span
                    key={col}
                    style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {col}
                  </span>
                ))}
              </div>
              {top5Clients.map((client, idx) => {
                const barPct = Math.round((client.totalBudget / maxClientBudget) * 100)
                return (
                  <div key={client.clientId} className="rpt-clients-row">
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--dash-text-primary)', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                        {client.name}
                      </span>
                      <div className="rpt-bar-track" style={{ marginTop: '5px' }}>
                        <div
                          className="rpt-bar-fill"
                          style={{ width: `${barPct}%`, background: idx === 0 ? 'var(--dash-success)' : 'var(--dash-accent)' }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text-secondary)', textAlign: 'center' }}>
                      {client.projectCount}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)' }}>
                      {barPct}% del top
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: idx === 0 ? 'var(--dash-success)' : 'var(--dash-text-primary)', textAlign: 'right' }}>
                      {formatMXNFull(client.totalBudget)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Top 5 proyectos por presupuesto ──────────────────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '20px' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Top 5 Proyectos por Presupuesto</h2>
            <p className="rpt-card-subtitle">Del periodo seleccionado</p>
          </div>

          {top5Projects.length === 0 ? (
            <p style={{ color: 'var(--dash-text-tertiary)', fontSize: '13px', padding: '24px 20px', margin: 0 }}>
              Sin proyectos con presupuesto en este periodo.
            </p>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '8px 20px', borderBottom: '1px solid var(--dash-border)' }}>
                {['Proyecto', 'Cliente', 'Estado', 'Presupuesto'].map((col) => (
                  <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col}
                  </span>
                ))}
              </div>
              {top5Projects.map((project, idx) => {
                const barPct = Math.round(((project.budget ?? 0) / maxProjectBudget) * 100)
                const clientName = project.client_id ? (clientMap.get(project.client_id) ?? '—') : '—'
                return (
                  <div key={project.id} className="rpt-table-row">
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '12px 20px', alignItems: 'center', borderBottom: idx < top5Projects.length - 1 ? '1px solid var(--dash-surface-2)' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '13px', color: 'var(--dash-text-primary)', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                          {project.title}
                        </span>
                        <div className="rpt-bar-track" style={{ marginTop: '6px' }}>
                          <div className="rpt-bar-fill" style={{ width: `${barPct}%`, background: 'var(--dash-accent)' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--dash-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                        {clientName}
                      </span>
                      <div>
                        <span
                          className="rpt-status-badge"
                          style={{ color: PROJECT_STATUS_COLOR[project.status], background: PROJECT_STATUS_BG[project.status] }}
                        >
                          {PROJECT_STATUS_LABEL[project.status]}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dash-success)', textAlign: 'right' }}>
                        {formatMXNFull(project.budget ?? 0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Distribucion de proyectos por estado ─────────────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '0' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Distribución por Estado</h2>
            <p className="rpt-card-subtitle">Todos los proyectos del periodo</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', padding: '16px' }}>
            {PROJECT_STATUS_ORDER.map((status) => {
              const count = projectsByStatus[status]
              const pct = Math.round((count / totalProjects) * 100)
              return (
                <div
                  key={status}
                  style={{
                    background: 'var(--dash-surface-1)',
                    border: `1px solid ${PROJECT_STATUS_COLOR[status]}33`,
                    borderRadius: '12px',
                    padding: '18px 20px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div
                    className="rpt-status-badge"
                    style={{
                      color: PROJECT_STATUS_COLOR[status],
                      background: PROJECT_STATUS_BG[status],
                      marginBottom: '12px',
                    }}
                  >
                    {PROJECT_STATUS_LABEL[status].toUpperCase()}
                  </div>
                  <p style={{ fontSize: '40px', fontWeight: 700, color: PROJECT_STATUS_COLOR[status], margin: '0 0 2px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {count}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: '6px 0 10px 0' }}>
                    {count === 1 ? 'proyecto' : 'proyectos'}
                  </p>
                  <div style={{ height: '4px', background: 'var(--dash-border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: PROJECT_STATUS_COLOR[status], borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </div>
                  <p style={{ fontSize: '11px', color: PROJECT_STATUS_COLOR[status], margin: '5px 0 0 0', fontWeight: 600 }}>
                    {pct}% del total
                  </p>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}
