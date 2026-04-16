import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { LeadActivityType } from '@/lib/supabase/types'

// ─── Raw query shapes ─────────────────────────────────────────────────────────

interface RawLeadActivity {
  id: string
  lead_id: string
  type: LeadActivityType
  content: string | null
  created_at: string
  old_status: string | null
  new_status: string | null
  lead: { name: string } | { name: string }[] | null
}

interface RawTaskActivity {
  id: string
  task_id: string
  action: string
  old_value: string | null
  new_value: string | null
  created_at: string
  task: { title: string } | { title: string }[] | null
}

interface RawDeliverableComment {
  id: string
  deliverable_id: string
  content: string
  created_at: string
  deliverable: { title: string } | { title: string }[] | null
}

// ─── Normalised item ──────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'lead_activity' | 'task_activity' | 'deliverable_comment'
  title: string
  subtitle: string
  createdAt: string
  link: string | undefined
  color: string
  icon: 'lead' | 'task' | 'comment'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_ACTIVITY_TYPE_LABEL: Record<LeadActivityType, string> = {
  note: 'Nota',
  email: 'Email',
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  meeting: 'Reunion',
  status_change: 'Cambio de estado',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveJoined<T>(raw: T | T[] | null): T | null {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days} dia${days !== 1 ? 's' : ''}`
}

/**
 * Returns a day-bucket label relative to today (server time at render).
 * Groups items by calendar day in UTC-3 (America/Argentina/Buenos_Aires).
 */
function dayLabel(isoDate: string): string {
  const ref = new Date(isoDate)
  const now = new Date()

  const toArgentineDate = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))

  const item = toArgentineDate(ref)
  const today = toArgentineDate(now)

  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - item.setHours(0, 0, 0, 0)) / 86_400_000
  )

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return `Hace ${diffDays} dias`
}

function buildLeadTitle(row: RawLeadActivity): string {
  if (row.type === 'status_change' && row.old_status && row.new_status) {
    return `Estado cambiado: ${row.old_status} → ${row.new_status}`
  }
  const typeLabel = LEAD_ACTIVITY_TYPE_LABEL[row.type] ?? row.type
  if (row.content) return `${typeLabel}: ${row.content.slice(0, 80)}${row.content.length > 80 ? '...' : ''}`
  return typeLabel
}

function buildTaskTitle(row: RawTaskActivity): string {
  if (row.old_value && row.new_value) {
    return `${row.action}: ${row.old_value} → ${row.new_value}`
  }
  if (row.new_value) return `${row.action}: ${row.new_value}`
  return row.action
}

// ─── Icon SVGs (inline, no external lib needed) ───────────────────────────────

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

// ─── Type pill ────────────────────────────────────────────────────────────────

const PILL_LABEL: Record<ActivityItem['type'], string> = {
  lead_activity: 'Lead',
  task_activity: 'Tarea',
  deliverable_comment: 'Entregable',
}

const PILL_COLOR: Record<ActivityItem['type'], string> = {
  lead_activity: '#0071E3',
  task_activity: '#BF5AF2',
  deliverable_comment: '#30D158',
}

const PILL_BG: Record<ActivityItem['type'], string> = {
  lead_activity: 'rgba(0,113,227,0.13)',
  task_activity: 'rgba(191,90,242,0.13)',
  deliverable_comment: 'rgba(48,209,88,0.13)',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActividadPage() {
  const supabase = createServiceClient()

  const [
    { data: leadActivitiesRaw },
    { data: taskActivitiesRaw },
    { data: deliverableCommentsRaw },
  ] = await Promise.all([
    supabase
      .from('lead_activities')
      .select('id, lead_id, type, content, created_at, old_status, new_status, lead:leads(name)')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('task_activity_log')
      .select('id, task_id, action, old_value, new_value, created_at, task:tasks(title)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('deliverable_comments')
      .select('id, deliverable_id, content, created_at, deliverable:project_deliverables(title)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // ── Normalise ──────────────────────────────────────────────────────────────

  const items: ActivityItem[] = []

  for (const row of (leadActivitiesRaw ?? []) as unknown as RawLeadActivity[]) {
    const lead = resolveJoined(row.lead)
    items.push({
      id: `lead-${row.id}`,
      type: 'lead_activity',
      title: buildLeadTitle(row),
      subtitle: lead?.name ?? 'Lead desconocido',
      createdAt: row.created_at,
      link: `/admin/leads`,
      color: '#0071E3',
      icon: 'lead',
    })
  }

  for (const row of (taskActivitiesRaw ?? []) as RawTaskActivity[]) {
    const task = resolveJoined(row.task)
    items.push({
      id: `task-${row.id}`,
      type: 'task_activity',
      title: buildTaskTitle(row),
      subtitle: task?.title ?? 'Tarea desconocida',
      createdAt: row.created_at,
      link: `/admin/kanban`,
      color: '#BF5AF2',
      icon: 'task',
    })
  }

  for (const row of (deliverableCommentsRaw ?? []) as RawDeliverableComment[]) {
    const deliverable = resolveJoined(row.deliverable)
    items.push({
      id: `comment-${row.id}`,
      type: 'deliverable_comment',
      title: row.content.slice(0, 100) + (row.content.length > 100 ? '...' : ''),
      subtitle: deliverable?.title ?? 'Entregable desconocido',
      createdAt: row.created_at,
      link: undefined,
      color: '#30D158',
      icon: 'comment',
    })
  }

  // Sort all items together by date descending
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
          border: 1px solid rgba(255,255,255,0.07);
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
          color: #48484A;
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
          <p style={{ color: '#48484A', fontSize: '14px', marginTop: '40px' }}>
            Sin actividad reciente.
          </p>
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
                      <IconDot color={item.color} />
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
                        <span className="act-time">{timeAgo(item.createdAt)}</span>
                      </div>
                      <p className="act-title">{item.title}</p>
                      <p className="act-subtitle">{item.subtitle}</p>
                    </div>
                  </>
                )

                return item.link ? (
                  <Link key={item.id} href={item.link} className="act-item-row">
                    {inner}
                  </Link>
                ) : (
                  <div key={item.id} className="act-item-row">
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

      </div>
    </>
  )
}
