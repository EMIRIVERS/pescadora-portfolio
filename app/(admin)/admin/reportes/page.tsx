import { createServiceClient } from '@/lib/supabase/server'
import type { LeadStatus, LeadSource, ProjectStatus } from '@/lib/supabase/types'
import PeriodSelector from './PeriodSelector'
import ExportButton from './ExportButton'

// ─── Local types ─────────────────────────────────────────────────────────────

interface LeadRow {
  id: string
  status: LeadStatus
  source: LeadSource
  created_at: string
  budget_range: string | null
}

interface ProjectDeliveredRow {
  id: string
  title: string
  status: ProjectStatus
  budget: number | null
  currency: string | null
  client_id: string | null
  created_at: string
  end_date: string | null
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

type Period = 'month' | '3months' | 'year' | 'all'

function getPeriodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString()
  }
  if (period === '3months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return d.toISOString()
  }
  if (period === 'year') {
    const d = new Date(now.getFullYear(), 0, 1)
    return d.toISOString()
  }
  return null
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
  new: '#0071E3',
  contacted: '#BF5AF2',
  qualified: '#FF9F0A',
  proposal: '#FF6961',
  won: '#30D158',
  lost: '#48484A',
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
  web: '#0071E3',
  whatsapp: '#30D158',
  referral: '#FF9F0A',
  manual: '#FF6961',
  other: '#48484A',
}

const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'pre_production',
  'production',
  'post_production',
  'delivered',
]

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  pre_production: 'Pre-produccion',
  production: 'Produccion',
  post_production: 'Post-produccion',
  delivered: 'Entregado',
}

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  pre_production: '#BF5AF2',
  production: '#30D158',
  post_production: '#FF9F0A',
  delivered: '#0071E3',
}

const PROJECT_STATUS_BG: Record<ProjectStatus, string> = {
  pre_production: 'rgba(191,90,242,0.12)',
  production: 'rgba(48,209,88,0.12)',
  post_production: 'rgba(255,159,10,0.12)',
  delivered: 'rgba(0,113,227,0.12)',
}

const LEAD_SOURCES: LeadSource[] = [
  'instagram',
  'web',
  'whatsapp',
  'referral',
  'manual',
  'other',
]

const MONTH_NAMES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLast6Months(): MonthBucket[] {
  const buckets: MonthBucket[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: MONTH_NAMES_ES[d.getMonth()],
    })
  }
  return buckets
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function ReportesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawPeriod = params.period ?? 'all'
  const period: Period = ['month', '3months', 'year', 'all'].includes(rawPeriod)
    ? (rawPeriod as Period)
    : 'all'

  const supabase = createServiceClient()
  const periodStart = getPeriodStart(period)

  // ── Queries ──────────────────────────────────────────────────────────────

  // All leads in period
  let leadsQuery = supabase
    .from('leads')
    .select('id, status, source, created_at, budget_range')
  if (periodStart) {
    leadsQuery = leadsQuery.gte('created_at', periodStart)
  }
  const { data: allLeadsRaw } = await leadsQuery

  // All projects in period (for pipeline + status distribution)
  let projectsQuery = supabase
    .from('projects')
    .select('id, title, status, created_at, client_id, budget, end_date')
  if (periodStart) {
    projectsQuery = projectsQuery.gte('created_at', periodStart)
  }
  const { data: allProjectsRaw } = await projectsQuery

  // Delivered projects in period (for revenue)
  let deliveredQuery = supabase
    .from('projects')
    .select('id, title, status, budget, currency, client_id, created_at, end_date')
    .eq('status', 'delivered')
  if (periodStart) {
    deliveredQuery = deliveredQuery.gte('created_at', periodStart)
  }
  const { data: deliveredRaw } = await deliveredQuery

  // Clients
  const { data: allClientsRaw } = await supabase
    .from('clients')
    .select('id, name, created_at')

  const allLeads: LeadRow[] = (allLeadsRaw ?? []) as unknown as LeadRow[]
  const allProjects: ProjectRow[] = (allProjectsRaw ?? []) as unknown as ProjectRow[]
  const deliveredProjects: ProjectDeliveredRow[] = (deliveredRaw ?? []) as unknown as ProjectDeliveredRow[]
  const clients: ClientRow[] = (allClientsRaw ?? []) as unknown as ClientRow[]

  // ── KPI calculations ─────────────────────────────────────────────────────

  const totalRevenue = deliveredProjects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const completedCount = deliveredProjects.length
  const totalLeads = allLeads.length
  const wonLeads = allLeads.filter((l) => l.status === 'won').length
  const lostLeads = allLeads.filter((l) => l.status === 'lost').length
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0
  const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0

  // ── Pipeline funnel ───────────────────────────────────────────────────────

  const leadsByStatus: Record<LeadStatus, number> = {
    new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0,
  }
  for (const lead of allLeads) {
    leadsByStatus[lead.status]++
  }
  const funnelMax = Math.max(leadsByStatus['new'], 1)

  // ── Revenue by month (last 6 months — always uses ALL delivered projects for this chart) ──

  const { data: allDeliveredRaw } = await supabase
    .from('projects')
    .select('id, budget, end_date, created_at, status')
    .eq('status', 'delivered')

  const allDelivered = (allDeliveredRaw ?? []) as unknown as ProjectDeliveredRow[]
  const months = getLast6Months()
  const monthlyRevenue = months.map((bucket) => {
    const revenue = allDelivered
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

  // ── Leads by source ───────────────────────────────────────────────────────

  const leadsBySource: Record<LeadSource, number> = {
    instagram: 0, web: 0, whatsapp: 0, referral: 0, manual: 0, other: 0,
  }
  for (const lead of allLeads) {
    leadsBySource[lead.source]++
  }
  const totalLeadsForSource = Math.max(allLeads.length, 1)

  // Build conic-gradient segments for donut
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
  // Fill remainder with dark
  if (runningPct < 100) {
    conicStops += `#1C1C1E ${runningPct}% 100%`
  } else {
    conicStops = conicStops.slice(0, -2)
  }
  const conicGradient = sourcesWithData.length > 0
    ? `conic-gradient(${conicStops})`
    : 'conic-gradient(#1C1C1E 0% 100%)'

  // ─────────────────────────────────────────────────────────────────────────

  const PERIOD_LABEL: Record<Period, string> = {
    month: 'Este mes',
    '3months': 'Ultimos 3 meses',
    year: 'Este ano',
    all: 'Todo el tiempo',
  }

  return (
    <>
      <style>{`
        .rpt-root {
          background-color: #000000;
          min-height: 100vh;
          padding: 2.5rem 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          color: #F5F5F7;
          box-sizing: border-box;
        }
        .rpt-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }
        .rpt-card-header {
          padding: 18px 20px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .rpt-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #F5F5F7;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .rpt-card-subtitle {
          font-size: 12px;
          color: #48484A;
          margin: 3px 0 0 0;
        }
        .rpt-kpi-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 22px 24px;
          transition: border-color 0.2s;
        }
        .rpt-kpi-card:hover { border-color: rgba(255,255,255,0.14); }
        .rpt-table-row { transition: background 0.15s; }
        .rpt-table-row:hover { background: rgba(255,255,255,0.03); }
        .rpt-bar-track {
          width: 100%;
          height: 5px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 7px;
        }
        .rpt-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .rpt-col-chart {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 160px;
          padding: 0 20px 0 20px;
        }
        .rpt-col-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          height: 100%;
          justify-content: flex-end;
        }
        .rpt-col-bar {
          width: 100%;
          background: linear-gradient(180deg, #0A84FF 0%, #0071E3 100%);
          border-radius: 4px 4px 0 0;
          min-height: 3px;
          transition: height 0.4s ease;
          position: relative;
          cursor: default;
        }
        .rpt-col-bar:hover { background: linear-gradient(180deg, #40A8FF 0%, #0A84FF 100%); }
        .rpt-col-label {
          font-size: 11px;
          color: #48484A;
          letter-spacing: 0.02em;
        }
        .rpt-funnel-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .rpt-funnel-bar {
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          transition: opacity 0.2s;
          position: relative;
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
      `}</style>

      <div className="rpt-root">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#F5F5F7', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Reportes y Analytics
            </h1>
            <p style={{ fontSize: '13px', color: '#48484A', margin: 0 }}>
              {PERIOD_LABEL[period]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <ExportButton period={period} />
            <PeriodSelector currentPeriod={period} />
          </div>
        </div>

        {/* ── Section 2: KPIs principales ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>

          {/* Revenue total */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(48,209,88,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#30D158', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Revenue Total
            </p>
            <p style={{ fontSize: totalRevenue >= 1_000_000 ? '26px' : '34px', fontWeight: 700, color: '#30D158', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {formatMXNFull(totalRevenue)}
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              proyectos entregados
            </p>
          </div>

          {/* Proyectos completados */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(0,113,227,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Proyectos Completados
            </p>
            <p style={{ fontSize: '40px', fontWeight: 700, color: '#0071E3', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {completedCount}
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              {allProjects.length} en total (todos estados)
            </p>
          </div>

          {/* Tasa de conversion */}
          <div className="rpt-kpi-card" style={{ borderColor: 'rgba(255,159,10,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
              Tasa de Conversion
            </p>
            <p style={{ fontSize: '40px', fontWeight: 700, color: conversionRate > 0 ? '#30D158' : '#F5F5F7', margin: '0 0 4px 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {conversionRate.toFixed(1)}%
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
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
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              por proyecto entregado
            </p>
          </div>
        </div>

        {/* ── Section 3: Revenue por mes (bar chart) ────────────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '20px' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Revenue por Mes</h2>
            <p className="rpt-card-subtitle">Ultimos 6 meses — proyectos entregados</p>
          </div>

          <div style={{ padding: '20px 20px 0' }}>
            {/* Y-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', paddingLeft: '4px' }}>
              {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                <span key={pct} style={{ fontSize: '10px', color: '#48484A' }}>
                  {formatMXN(maxRevenue * pct)}
                </span>
              ))}
            </div>
            {/* SVG gridlines + bars */}
            <div style={{ position: 'relative', height: '180px', paddingBottom: '28px' }}>
              {/* Gridlines */}
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
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
              {/* Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '152px', position: 'relative', zIndex: 1 }}>
                {monthlyRevenue.map((m) => {
                  const heightPct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
                  return (
                    <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%', justifyContent: 'flex-end' }}>
                      {m.revenue > 0 && (
                        <span style={{ fontSize: '9px', color: '#0071E3', fontWeight: 600, marginBottom: '3px', letterSpacing: '-0.01em' }}>
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

        {/* ── Section 4 + 6: Pipeline funnel + Fuentes de leads ────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

          {/* Pipeline funnel */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h2 className="rpt-card-title">Pipeline Funnel</h2>
              <p className="rpt-card-subtitle">Conversion entre etapas</p>
            </div>
            <div style={{ padding: '20px' }}>
              {LEAD_STATUS_FUNNEL.map((status, idx) => {
                const count = leadsByStatus[status]
                const widthPct = Math.max((count / funnelMax) * 100, 8)
                const nextStatus = LEAD_STATUS_FUNNEL[idx + 1]
                const nextCount = nextStatus ? leadsByStatus[nextStatus] : null
                const convPct = count > 0 && nextCount !== null
                  ? Math.round((nextCount / count) * 100)
                  : null

                return (
                  <div key={status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Funnel bar */}
                    <div style={{ width: `${widthPct}%`, transition: 'width 0.4s ease' }}>
                      <div
                        className="rpt-funnel-bar"
                        style={{ background: `${LEAD_STATUS_COLOR[status]}22`, border: `1px solid ${LEAD_STATUS_COLOR[status]}44`, width: '100%' }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 600, color: LEAD_STATUS_COLOR[status], flex: 1 }}>
                          {LEAD_STATUS_LABEL[status]}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#F5F5F7', marginLeft: '8px' }}>
                          {count}
                        </span>
                      </div>
                    </div>
                    {/* Conversion arrow between stages */}
                    {convPct !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '3px 0' }}>
                        <svg width="12" height="16" viewBox="0 0 12 16">
                          <path d="M6 0 L6 10 M2 7 L6 13 L10 7" stroke="#48484A" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: '10px', color: convPct >= 50 ? '#30D158' : '#48484A', fontWeight: 500 }}>
                          {convPct}%
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Lost */}
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(72,72,74,0.15)', borderRadius: '8px', border: '1px solid rgba(72,72,74,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#48484A', fontWeight: 500 }}>Perdidos</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#48484A' }}>{leadsByStatus['lost']}</span>
              </div>
            </div>
          </div>

          {/* Section 6: Fuentes de leads — donut */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h2 className="rpt-card-title">Fuentes de Leads</h2>
              <p className="rpt-card-subtitle">Distribucion por canal de origen</p>
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
                {/* Hole */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#111111',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#F5F5F7', lineHeight: 1 }}>{totalLeads}</span>
                  <span style={{ fontSize: '9px', color: '#48484A', marginTop: '2px' }}>leads</span>
                </div>
              </div>
              {/* Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(sourcesWithData.length > 0 ? sourcesWithData : LEAD_SOURCES.map((s) => ({ source: s, count: 0, pct: 0, color: LEAD_SOURCE_COLOR[s] }))).slice(0, 6).map((s) => (
                  <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#86868B', flex: 1 }}>{LEAD_SOURCE_LABEL[s.source]}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: s.count > 0 ? '#F5F5F7' : '#48484A' }}>{s.count}</span>
                    <span style={{ fontSize: '11px', color: '#48484A', width: '32px', textAlign: 'right' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 5: Top 5 proyectos por presupuesto ───────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '20px' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Top 5 Proyectos por Presupuesto</h2>
            <p className="rpt-card-subtitle">Del periodo seleccionado</p>
          </div>

          {top5Projects.length === 0 ? (
            <p style={{ color: '#48484A', fontSize: '13px', padding: '24px 20px', margin: 0 }}>
              Sin proyectos con presupuesto en este periodo.
            </p>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Proyecto', 'Cliente', 'Estado', 'Presupuesto'].map((col) => (
                  <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: '#48484A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col}
                  </span>
                ))}
              </div>
              {top5Projects.map((project, idx) => {
                const barPct = Math.round(((project.budget ?? 0) / maxProjectBudget) * 100)
                const clientName = project.client_id ? (clientMap.get(project.client_id) ?? '—') : '—'
                return (
                  <div key={project.id} className="rpt-table-row">
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '12px 20px', alignItems: 'center', borderBottom: idx < top5Projects.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '13px', color: '#F5F5F7', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                          {project.title}
                        </span>
                        <div className="rpt-bar-track" style={{ marginTop: '6px' }}>
                          <div className="rpt-bar-fill" style={{ width: `${barPct}%`, background: '#0071E3' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
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
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#30D158', textAlign: 'right' }}>
                        {formatMXNFull(project.budget ?? 0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Section 7: Distribucion de proyectos por estado ──────────────── */}
        <div className="rpt-card" style={{ marginBottom: '0' }}>
          <div className="rpt-card-header">
            <h2 className="rpt-card-title">Distribucion por Estado</h2>
            <p className="rpt-card-subtitle">Todos los proyectos del periodo</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px' }}>
            {PROJECT_STATUS_ORDER.map((status) => {
              const count = projectsByStatus[status]
              const pct = Math.round((count / totalProjects) * 100)
              return (
                <div
                  key={status}
                  style={{
                    background: '#111111',
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
                  <p style={{ fontSize: '12px', color: '#48484A', margin: '6px 0 10px 0' }}>
                    {count === 1 ? 'proyecto' : 'proyectos'}
                  </p>
                  {/* Percentage bar */}
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
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
