import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

// ─── Raw query shapes ─────────────────────────────────────────────────────────

interface RawLeadActivity {
  id: string
  lead_id: string
  type: string
  content: string | null
  created_at: string
  lead: { name: string; email: string | null } | { name: string; email: string | null }[] | null
}

interface RawTaskActivity {
  id: string
  project_id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
  project: { title: string } | { title: string }[] | null
}

interface RawLead {
  id: string
  name: string
  email: string | null
  created_at: string
}

interface RawDeliverable {
  id: string
  project_id: string
  title: string
  created_at: string
  project: { title: string } | { title: string }[] | null
}

// ─── Normalised item ──────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'lead_action' | 'project_action' | 'lead_new' | 'deliverable_new'
  title: string
  subtitle: string
  createdAt: string
  linkHref: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveJoined<T>(raw: T | T[] | null): T | null {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function formatRelativeTime(isoDate: string): string {
  const now = new Date()
  const date = new Date(isoDate)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    const hours = Math.floor(diffHours)
    if (hours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `hace ${minutes} min`
    }
    return `hace ${hours}h`
  }

  const toLocal = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))

  const localNow = toLocal(now)
  const localDate = toLocal(date)

  const todayStart = new Date(localNow)
  todayStart.setHours(0, 0, 0, 0)
  const itemStart = new Date(localDate)
  itemStart.setHours(0, 0, 0, 0)

  const diffDays = Math.round((todayStart.getTime() - itemStart.getTime()) / 86_400_000)

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'

  return localDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: localDate.getFullYear() !== localNow.getFullYear() ? 'numeric' : undefined,
  })
}

function dayLabel(isoDate: string): string {
  const ref = new Date(isoDate)
  const now = new Date()

  const toLocal = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))

  const item = toLocal(ref)
  const today = toLocal(now)

  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const itemStart = new Date(item)
  itemStart.setHours(0, 0, 0, 0)

  const diffDays = Math.round((todayStart.getTime() - itemStart.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return `Hace ${diffDays} dias`
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

// ─── Pill config ──────────────────────────────────────────────────────────────

const PILL_LABEL: Record<ActivityItem['type'], string> = {
  lead_action: 'Lead',
  project_action: 'Proyecto',
  lead_new: 'Nuevo lead',
  deliverable_new: 'Entregable',
}

const PILL_COLOR: Record<ActivityItem['type'], string> = {
  lead_action: '#0071E3',
  project_action: '#BF5AF2',
  lead_new: '#30D158',
  deliverable_new: '#FF9F0A',
}

const PILL_BG: Record<ActivityItem['type'], string> = {
  lead_action: 'rgba(0,113,227,0.13)',
  project_action: 'rgba(191,90,242,0.13)',
  lead_new: 'rgba(48,209,88,0.13)',
  deliverable_new: 'rgba(255,159,10,0.13)',
}

const DOT_COLOR: Record<ActivityItem['type'], string> = {
  lead_action: '#0071E3',
  project_action: '#BF5AF2',
  lead_new: '#30D158',
  deliverable_new: '#FF9F0A',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}80`,
      }}
    />
  )
}

function ClockIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <circle cx="16" cy="16" r="13" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <path
        d="M16 9v7l4 4"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActividadPage() {
  const supabase = createServiceClient()
  const cutoff = thirtyDaysAgo()

  // ── Query 1: lead_activities joined with leads ─────────────────────────────
  let leadActivities: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('lead_activities')
      .select('id, lead_id, type, content, created_at, lead:leads(name, email)')
      .order('created_at', { ascending: false })
      .limit(30)

    for (const row of (data ?? []) as unknown as RawLeadActivity[]) {
      const lead = resolveJoined(row.lead)
      const leadName = lead?.name ?? 'Lead desconocido'
      leadActivities.push({
        id: `lead-act-${row.id}`,
        type: 'lead_action',
        title: `Actividad en lead: ${leadName}`,
        subtitle: row.content ?? row.type,
        createdAt: row.created_at,
        linkHref: '/admin/leads',
      })
    }
  } catch {
    leadActivities = []
  }

  // ── Query 2: task_activity_log joined with projects ────────────────────────
  let taskActivities: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('task_activity_log')
      .select('id, project_id, action, metadata, created_at, project:projects(title)')
      .order('created_at', { ascending: false })
      .limit(20)

    for (const row of (data ?? []) as unknown as RawTaskActivity[]) {
      const project = resolveJoined(row.project)
      const projectTitle = project?.title ?? 'Proyecto desconocido'
      taskActivities.push({
        id: `task-act-${row.id}`,
        type: 'project_action',
        title: row.action,
        subtitle: `Proyecto: ${projectTitle}`,
        createdAt: row.created_at,
        linkHref: `/admin/projects/${row.project_id}`,
      })
    }
  } catch {
    taskActivities = []
  }

  // ── Query 3: leads recientes (ultimos 30 dias) ─────────────────────────────
  let recentLeads: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('leads')
      .select('id, name, email, created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20)

    for (const row of (data ?? []) as unknown as RawLead[]) {
      recentLeads.push({
        id: `lead-new-${row.id}`,
        type: 'lead_new',
        title: `Nuevo lead: ${row.name}`,
        subtitle: row.email ?? 'Sin email',
        createdAt: row.created_at,
        linkHref: '/admin/leads',
      })
    }
  } catch {
    recentLeads = []
  }

  // ── Query 4: project_deliverables recientes (ultimos 30 dias) ─────────────
  let recentDeliverables: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('project_deliverables')
      .select('id, project_id, title, created_at, project:projects(title)')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20)

    for (const row of (data ?? []) as unknown as RawDeliverable[]) {
      const project = resolveJoined(row.project)
      const projectTitle = project?.title ?? 'Proyecto desconocido'
      recentDeliverables.push({
        id: `deliverable-new-${row.id}`,
        type: 'deliverable_new',
        title: `Entregable: ${row.title}`,
        subtitle: `Proyecto: ${projectTitle}`,
        createdAt: row.created_at,
        linkHref: `/admin/projects/${row.project_id}`,
      })
    }
  } catch {
    recentDeliverables = []
  }

  // ── Merge and sort ─────────────────────────────────────────────────────────

  const allItems: ActivityItem[] = [
    ...leadActivities,
    ...taskActivities,
    ...recentLeads,
    ...recentDeliverables,
  ]

  // Deduplicate by id (in case a lead appears in both lead_activities and leads)
  const seen = new Set<string>()
  const items: ActivityItem[] = []
  for (const item of allItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // ── Group by day ───────────────────────────────────────────────────────────

  interface DayGroup {
    label: string
    items: ActivityItem[]
  }

  const groups: DayGroup[] = []
  const seenDays = new Map<string, DayGroup>()

  for (const item of items) {
    const label = dayLabel(item.createdAt)
    if (!seenDays.has(label)) {
      const group: DayGroup = { label, items: [] }
      groups.push(group)
      seenDays.set(label, group)
    }
    seenDays.get(label)!.items.push(item)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .act-root {
          background-color: #000000;
          min-height: 100vh;
          padding: 2.5rem 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          color: #F5F5F7;
          box-sizing: border-box;
          max-width: 860px;
        }
        .act-item-row {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          padding: 14px 0;
          text-decoration: none;
          color: inherit;
          position: relative;
        }
        .act-item-row:hover .act-card {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
        }
        .act-item-row:hover .act-title {
          color: #F5F5F7;
        }
        .act-card {
          flex: 1;
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px 16px;
          transition: background 0.15s, border-color 0.15s;
          min-width: 0;
        }
        .act-title {
          font-size: 14px;
          font-weight: 400;
          color: #D1D1D6;
          margin: 0 0 4px 0;
          line-height: 1.4;
          word-break: break-word;
          transition: color 0.15s;
        }
        .act-subtitle {
          font-size: 12px;
          color: #86868B;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .act-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .act-pill {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          border-radius: 5px;
          padding: 2px 7px;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .act-time {
          font-size: 11px;
          color: #48484A;
          flex-shrink: 0;
          margin-left: auto;
        }
        .act-day-label {
          font-size: 11px;
          font-weight: 600;
          color: #48484A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 24px 0 10px 0;
          margin: 0;
        }
        .act-day-label:first-child {
          padding-top: 0;
        }
        .act-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 48px 32px;
          margin-top: 40px;
          text-align: center;
        }
        .act-empty-title {
          font-size: 15px;
          font-weight: 500;
          color: #F5F5F7;
          margin: 0;
        }
        .act-empty-desc {
          font-size: 13px;
          color: #86868B;
          margin: 0;
          max-width: 320px;
          line-height: 1.5;
        }
      `}</style>

      <div className="act-root">

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#F5F5F7',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Actividad reciente
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#86868B',
              margin: 0,
            }}
          >
            Ultimas acciones en el sistema
          </p>
        </div>

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <div className="act-empty">
            <ClockIcon />
            <p className="act-empty-title">Sin actividad reciente</p>
            <p className="act-empty-desc">
              La actividad aparecera aqui cuando se creen leads, proyectos o entregables.
            </p>
          </div>
        )}

        {/* ── Timeline ── */}
        {groups.map((group) => (
          <div key={group.label}>
            {/* Day separator */}
            <p className="act-day-label">{group.label}</p>

            {/* Items in this day */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Vertical line */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '4px',
                  top: '20px',
                  bottom: '20px',
                  width: '1px',
                  background: 'rgba(255,255,255,0.07)',
                  pointerEvents: 'none',
                }}
              />

              {group.items.map((item) => {
                const dotColor = DOT_COLOR[item.type]
                const inner = (
                  <>
                    {/* Dot column */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: '16px',
                        width: '10px',
                        flexShrink: 0,
                      }}
                    >
                      <IconDot color={dotColor} />
                    </div>

                    {/* Card */}
                    <div className="act-card">
                      <div className="act-meta">
                        <span
                          className="act-pill"
                          style={{
                            color: PILL_COLOR[item.type],
                            background: PILL_BG[item.type],
                          }}
                        >
                          {PILL_LABEL[item.type]}
                        </span>
                        <span className="act-time">{formatRelativeTime(item.createdAt)}</span>
                      </div>
                      <p className="act-title">{item.title}</p>
                      <p className="act-subtitle">{item.subtitle}</p>
                    </div>
                  </>
                )

                return (
                  <Link key={item.id} href={item.linkHref} className="act-item-row">
                    {inner}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

      </div>
    </>
  )
}
