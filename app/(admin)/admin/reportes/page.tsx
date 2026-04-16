import { createServiceClient } from '@/lib/supabase/server'
import type { LeadStatus, LeadSource, ProjectStatus } from '@/lib/supabase/types'

// ─── Local types ─────────────────────────────────────────────────────────────

interface LeadRow {
  id: string
  status: LeadStatus
  source: LeadSource
  created_at: string
  budget_range: string | null
}

interface ProjectRow {
  id: string
  title: string
  status: ProjectStatus
  created_at: string
  client_id: string | null
}

interface ClientRow {
  id: string
  created_at: string
}

interface MonthBucket {
  year: number
  month: number // 0-indexed
  label: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STATUS_ORDER: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
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
      label: `${MONTH_NAMES_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    })
  }
  return buckets
}

function isInMonth(isoDate: string, year: number, month: number): boolean {
  const d = new Date(isoDate)
  return d.getFullYear() === year && d.getMonth() === month
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportesPage() {
  const supabase = createServiceClient()

  const [
    { data: allLeadsRaw },
    { data: allProjectsRaw },
    { data: allClients },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, status, source, created_at, budget_range'),
    supabase
      .from('projects')
      .select('id, title, status, created_at, client_id'),
    supabase
      .from('clients')
      .select('id, created_at'),
  ])

  const allLeads: LeadRow[] = (allLeadsRaw ?? []) as LeadRow[]
  const allProjects: ProjectRow[] = (allProjectsRaw ?? []) as ProjectRow[]
  const clients: ClientRow[] = (allClients ?? [])

  // ── 1. Summary metrics ────────────────────────────────────────────────────

  const totalLeads = allLeads.length
  const wonLeads = allLeads.filter((l) => l.status === 'won').length
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0

  // Active clients = clients that have at least 1 project with status != 'delivered'
  const activeProjectClientIds = new Set(
    allProjects
      .filter((p) => p.status !== 'delivered' && p.client_id !== null)
      .map((p) => p.client_id as string),
  )
  const activeClients = clients.filter((c) =>
    activeProjectClientIds.has(c.id),
  ).length

  // Projected revenue: projects with status != 'delivered'
  // Note: budget/currency fields are not yet in the schema; showing project count instead
  const activeProjectsCount = allProjects.filter(
    (p) => p.status !== 'delivered',
  ).length

  // ── 2. Leads pipeline by status ───────────────────────────────────────────

  const leadsByStatus: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal: 0,
    won: 0,
    lost: 0,
  }
  for (const lead of allLeads) {
    leadsByStatus[lead.status]++
  }
  const maxLeadCount = Math.max(...Object.values(leadsByStatus), 1)

  // ── 3. Projects by status ─────────────────────────────────────────────────

  const projectsByStatus: Record<ProjectStatus, number> = {
    pre_production: 0,
    production: 0,
    post_production: 0,
    delivered: 0,
  }
  for (const project of allProjects) {
    projectsByStatus[project.status]++
  }

  // ── 4. Leads by source ────────────────────────────────────────────────────

  const LEAD_SOURCES: LeadSource[] = [
    'instagram',
    'web',
    'whatsapp',
    'referral',
    'manual',
    'other',
  ]
  const leadsBySource: Record<LeadSource, number> = {
    instagram: 0,
    web: 0,
    whatsapp: 0,
    referral: 0,
    manual: 0,
    other: 0,
  }
  for (const lead of allLeads) {
    leadsBySource[lead.source]++
  }
  const maxSourceCount = Math.max(...Object.values(leadsBySource), 1)

  // ── 5. Activity by month (last 6 months) ──────────────────────────────────

  const months = getLast6Months()
  const monthlyActivity = months.map((bucket) => ({
    label: bucket.label,
    newLeads: allLeads.filter((l) =>
      isInMonth(l.created_at, bucket.year, bucket.month),
    ).length,
    newProjects: allProjects.filter((p) =>
      isInMonth(p.created_at, bucket.year, bucket.month),
    ).length,
  }))

  // ── 6. Top 10 projects (by title alphabetically since no budget field) ────
  // We show all projects sorted by created_at desc, top 10

  const top10Projects = [...allProjects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  // ─────────────────────────────────────────────────────────────────────────

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
        .rpt-card:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .rpt-stat-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          transition: border-color 0.2s;
        }
        .rpt-stat-card:hover {
          border-color: rgba(255,255,255,0.14);
        }
        .rpt-proj-status-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px 24px;
          transition: border-color 0.2s;
        }
        .rpt-proj-status-card:hover {
          border-color: rgba(255,255,255,0.14);
        }
        .rpt-table-row {
          transition: background 0.15s;
        }
        .rpt-table-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .rpt-progress-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 6px;
        }
        .rpt-source-bar-track {
          flex: 1;
          height: 5px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
        }
      `}</style>

      <div className="rpt-root">

        {/* ── Header ─────────────────────────────────────────────────────── */}
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
            Reportes y Analytics
          </h1>
          <p style={{ fontSize: '13px', color: '#86868B', margin: 0 }}>
            Metricas de negocio en tiempo real
          </p>
        </div>

        {/* ── 1. Summary stat cards ──────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {/* Total leads */}
          <div className="rpt-stat-card">
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#86868B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px 0',
              }}
            >
              Total Leads
            </p>
            <p
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#0071E3',
                margin: '0 0 4px 0',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {totalLeads}
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              captados en total
            </p>
          </div>

          {/* Conversion rate */}
          <div className="rpt-stat-card">
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#86868B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px 0',
              }}
            >
              Tasa de Conversion
            </p>
            <p
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#30D158',
                margin: '0 0 4px 0',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {formatPercent(conversionRate)}
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              {wonLeads} leads ganados
            </p>
          </div>

          {/* Active clients */}
          <div className="rpt-stat-card">
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#86868B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px 0',
              }}
            >
              Clientes Activos
            </p>
            <p
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#FF9F0A',
                margin: '0 0 4px 0',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {activeClients}
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              con proyectos en curso
            </p>
          </div>

          {/* Projects in progress */}
          <div className="rpt-stat-card">
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#86868B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px 0',
              }}
            >
              Proyectos Activos
            </p>
            <p
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#BF5AF2',
                margin: '0 0 4px 0',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {activeProjectsCount}
            </p>
            <p style={{ fontSize: '12px', color: '#48484A', margin: 0 }}>
              sin entregar
            </p>
          </div>
        </div>

        {/* ── 2 + 3: Two-column row — Pipeline + Proyectos ───────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* ── Pipeline de leads ──────────────────────────────────────────── */}
          <div className="rpt-card">
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                  margin: 0,
                }}
              >
                Pipeline de Leads
              </h2>
            </div>

            <div style={{ padding: '8px 0' }}>
              {LEAD_STATUS_ORDER.map((status, idx) => {
                const count = leadsByStatus[status]
                const pct = Math.round((count / maxLeadCount) * 100)
                return (
                  <div
                    key={status}
                    className="rpt-table-row"
                    style={{
                      padding: '12px 20px',
                      borderBottom:
                        idx < LEAD_STATUS_ORDER.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          color: LEAD_STATUS_COLOR[status],
                          fontWeight: 500,
                        }}
                      >
                        {LEAD_STATUS_LABEL[status]}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#F5F5F7',
                        }}
                      >
                        {count}
                      </span>
                    </div>
                    <div className="rpt-progress-bar-track">
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: LEAD_STATUS_COLOR[status],
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Proyectos por estado ───────────────────────────────────────── */}
          <div className="rpt-card">
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                  margin: 0,
                }}
              >
                Proyectos por Estado
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '16px',
              }}
            >
              {PROJECT_STATUS_ORDER.map((status) => {
                const count = projectsByStatus[status]
                return (
                  <div
                    key={status}
                    className="rpt-proj-status-card"
                    style={{
                      borderColor: `${PROJECT_STATUS_COLOR[status]}33`,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: PROJECT_STATUS_COLOR[status],
                        background: PROJECT_STATUS_BG[status],
                        borderRadius: '5px',
                        padding: '2px 8px',
                        letterSpacing: '0.04em',
                        marginBottom: '10px',
                      }}
                    >
                      {PROJECT_STATUS_LABEL[status].toUpperCase()}
                    </div>
                    <p
                      style={{
                        fontSize: '36px',
                        fontWeight: 700,
                        color: PROJECT_STATUS_COLOR[status],
                        margin: 0,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                      }}
                    >
                      {count}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        color: '#48484A',
                        margin: '6px 0 0 0',
                      }}
                    >
                      {count === 1 ? 'proyecto' : 'proyectos'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── 4 + 5: Two-column row — Fuentes + Actividad mensual ───────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.6fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* ── Leads por fuente ────────────────────────────────────────────── */}
          <div className="rpt-card">
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                  margin: 0,
                }}
              >
                Leads por Fuente
              </h2>
            </div>

            <div style={{ padding: '8px 0' }}>
              {LEAD_SOURCES.map((source, idx) => {
                const count = leadsBySource[source]
                const pct = Math.round((count / maxSourceCount) * 100)
                return (
                  <div
                    key={source}
                    className="rpt-table-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 20px',
                      borderBottom:
                        idx < LEAD_SOURCES.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#F5F5F7',
                        width: '80px',
                        flexShrink: 0,
                      }}
                    >
                      {LEAD_SOURCE_LABEL[source]}
                    </span>
                    <div className="rpt-source-bar-track">
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: '#0071E3',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: count > 0 ? '#F5F5F7' : '#48484A',
                        width: '24px',
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Actividad por mes ───────────────────────────────────────────── */}
          <div className="rpt-card">
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                  margin: 0,
                }}
              >
                Actividad — Ultimos 6 Meses
              </h2>
            </div>

            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '10px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {['Mes', 'Leads nuevos', 'Proyectos'].map((col) => (
                <span
                  key={col}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#48484A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {col}
                </span>
              ))}
            </div>

            {monthlyActivity.map((row, idx) => (
              <div
                key={row.label}
                className="rpt-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '13px 20px',
                  borderBottom:
                    idx < monthlyActivity.length - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                }}
              >
                <span style={{ fontSize: '13px', color: '#86868B' }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: row.newLeads > 0 ? 600 : 400,
                    color: row.newLeads > 0 ? '#0071E3' : '#48484A',
                  }}
                >
                  {row.newLeads > 0 ? `+${row.newLeads}` : '—'}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: row.newProjects > 0 ? 600 : 400,
                    color: row.newProjects > 0 ? '#30D158' : '#48484A',
                  }}
                >
                  {row.newProjects > 0 ? `+${row.newProjects}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6. Proyectos recientes (top 10) ───────────────────────────── */}
        <div className="rpt-card" style={{ marginBottom: '16px' }}>
          <div
            style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#F5F5F7',
                margin: 0,
              }}
            >
              Ultimos 10 Proyectos
            </h2>
          </div>

          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              padding: '10px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {['Titulo', 'Estado', 'Fecha'].map((col) => (
              <span
                key={col}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#48484A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {col}
              </span>
            ))}
          </div>

          {top10Projects.length === 0 && (
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

          {top10Projects.map((project, idx) => {
            const dateStr = new Date(project.created_at).toLocaleDateString(
              'es-MX',
              { day: '2-digit', month: '2-digit', year: '2-digit' },
            )
            return (
              <div
                key={project.id}
                className="rpt-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  alignItems: 'center',
                  padding: '13px 20px',
                  borderBottom:
                    idx < top10Projects.length - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#F5F5F7',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '12px',
                  }}
                >
                  {project.title}
                </span>

                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: PROJECT_STATUS_COLOR[project.status],
                    background: PROJECT_STATUS_BG[project.status],
                    borderRadius: '6px',
                    padding: '3px 9px',
                    width: 'fit-content',
                  }}
                >
                  {PROJECT_STATUS_LABEL[project.status]}
                </span>

                <span style={{ fontSize: '12px', color: '#48484A' }}>
                  {dateStr}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}
