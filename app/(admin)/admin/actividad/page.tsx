import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import ActivityFilter from './ActivityFilter'
import type { ActivityItem } from './ActivityFilter'

// Rows fetched per source per page; controlled via the ?page= search param.
const PAGE_SIZE = 50

// ─── Raw query shapes ─────────────────────────────────────────────────────────

interface RawLeadActivity {
  id: string
  lead_id: string
  user_id: string | null
  type: string
  content: string | null
  old_status: string | null
  new_status: string | null
  created_at: string
  lead: { name: string; email: string | null; company: string | null } | { name: string; email: string | null; company: string | null }[] | null
  profile: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

interface RawTaskActivity {
  id: string
  task_id: string
  action: string
  old_value: string | null
  new_value: string | null
  created_at: string
  task: { title: string; project_id: string | null; project: { title: string } | null } | null
}

interface RawLead {
  id: string
  name: string
  email: string | null
  company: string | null
  created_at: string
}

interface RawDeliverable {
  id: string
  project_id: string
  title: string
  created_at: string
  project: { title: string } | { title: string }[] | null
}

interface RawEmailLog {
  id: string
  sent_at: string
  to_email: string
  subject: string
  template_name: string | null
  status: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveJoined<T>(raw: T | T[] | null): T | null {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function ActividadPage({ searchParams }: PageProps) {
  const { page } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1)
  const rangeFrom = (currentPage - 1) * PAGE_SIZE
  const rangeTo = rangeFrom + PAGE_SIZE - 1

  const supabase = createServiceClient()

  // If any source returns a full page, there is (probably) a next page.
  let hasNextPage = false

  // ── Query 1: lead_activities joined with leads + profiles ─────────────────
  let leadActivities: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('lead_activities')
      .select(
        'id, lead_id, user_id, type, content, old_status, new_status, created_at, lead:leads(name, email, company), profile:profiles(full_name, email)'
      )
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if ((data ?? []).length === PAGE_SIZE) hasNextPage = true

    for (const row of (data ?? []) as unknown as RawLeadActivity[]) {
      const lead = resolveJoined(row.lead)
      const profile = resolveJoined(row.profile)
      const leadName = lead?.name ?? 'Lead desconocido'
      const userName = profile?.full_name ?? profile?.email ?? null

      leadActivities.push({
        id: `lead-act-${row.id}`,
        type: 'lead_action',
        activitySubType: row.type as ActivityItem['activitySubType'],
        title: `Actividad en lead`,
        subtitle: row.content ?? row.type,
        createdAt: row.created_at,
        linkHref: `/admin/leads?lead=${row.lead_id}`,
        userName: userName,
        leadName: leadName,
        leadId: row.lead_id,
        leadCompany: lead?.company ?? null,
        oldStatus: row.old_status ?? null,
        newStatus: row.new_status ?? null,
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
      .select('id, task_id, action, old_value, new_value, created_at, task:tasks(title, project_id, project:projects(title))')
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if ((data ?? []).length === PAGE_SIZE) hasNextPage = true

    for (const row of (data ?? []) as unknown as RawTaskActivity[]) {
      const task = Array.isArray(row.task) ? row.task[0] : row.task
      const project = task?.project && Array.isArray(task.project) ? task.project[0] : task?.project
      const projectTitle = project?.title ?? 'Proyecto desconocido'
      const projectId = task?.project_id ?? null
      taskActivities.push({
        id: `task-act-${row.id}`,
        type: 'project_action',
        activitySubType: null,
        title: row.action,
        subtitle: `Tarea: ${task?.title ?? 'desconocida'} — Proyecto: ${projectTitle}`,
        createdAt: row.created_at,
        linkHref: projectId ? `/admin/projects/${projectId}` : '/admin/kanban',
        userName: null,
        leadName: null,
        leadId: null,
        leadCompany: null,
        oldStatus: null,
        newStatus: null,
      })
    }
  } catch {
    taskActivities = []
  }

  // ── Query 3: leads recientes ───────────────────────────────────────────────
  let recentLeads: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('leads')
      .select('id, name, email, company, created_at')
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if ((data ?? []).length === PAGE_SIZE) hasNextPage = true

    for (const row of (data ?? []) as unknown as RawLead[]) {
      recentLeads.push({
        id: `lead-new-${row.id}`,
        type: 'lead_new',
        activitySubType: null,
        title: `Nuevo lead: ${row.name}`,
        subtitle: row.email ?? 'Sin email',
        createdAt: row.created_at,
        linkHref: `/admin/leads?lead=${row.id}`,
        userName: null,
        leadName: row.name,
        leadId: row.id,
        leadCompany: row.company ?? null,
        oldStatus: null,
        newStatus: null,
      })
    }
  } catch {
    recentLeads = []
  }

  // ── Query 4: project_deliverables recientes ────────────────────────────────
  let recentDeliverables: ActivityItem[] = []
  try {
    const { data } = await supabase
      .from('project_deliverables')
      .select('id, project_id, title, created_at, project:projects(title)')
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if ((data ?? []).length === PAGE_SIZE) hasNextPage = true

    for (const row of (data ?? []) as unknown as RawDeliverable[]) {
      const project = resolveJoined(row.project)
      const projectTitle = project?.title ?? 'Proyecto desconocido'
      recentDeliverables.push({
        id: `deliverable-new-${row.id}`,
        type: 'deliverable_new',
        activitySubType: null,
        title: `Entregable: ${row.title}`,
        subtitle: `Proyecto: ${projectTitle}`,
        createdAt: row.created_at,
        linkHref: `/admin/projects/${row.project_id}`,
        userName: null,
        leadName: null,
        leadId: null,
        leadCompany: null,
        oldStatus: null,
        newStatus: null,
      })
    }
  } catch {
    recentDeliverables = []
  }

  // ── Query 5: email_log ─────────────────────────────────────────────────────
  let emailItems: ActivityItem[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('email_log')
      .select('id, sent_at, to_email, subject, template_name, status')
      .order('sent_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if ((data ?? []).length === PAGE_SIZE) hasNextPage = true

    for (const row of (data ?? []) as unknown as RawEmailLog[]) {
      emailItems.push({
        id: `email-${row.id}`,
        type: 'email_sent',
        activitySubType: null,
        title: `Email: ${row.subject}`,
        subtitle: `Para: ${row.to_email}`,
        createdAt: row.sent_at,
        linkHref: '#',
        userName: 'Sistema',
        leadName: null,
        leadId: null,
        leadCompany: null,
        oldStatus: null,
        newStatus: null,
      })
    }
  } catch {
    emailItems = []
  }

  // ── Merge and sort ─────────────────────────────────────────────────────────

  const allItems: ActivityItem[] = [
    ...leadActivities,
    ...taskActivities,
    ...recentLeads,
    ...recentDeliverables,
    ...emailItems,
  ]

  // Deduplicate by id
  const seen = new Set<string>()
  const items: ActivityItem[] = []
  for (const item of allItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .act-root {
          background-color: var(--dash-bg);
          min-height: 100vh;
          padding: 2.5rem 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          color: var(--dash-text-primary);
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
          background: var(--dash-surface-2);
          border-color: rgba(255,255,255,0.12);
        }
        .act-item-row:hover .act-title {
          color: var(--dash-text-primary);
        }
        .act-card {
          flex: 1;
          background: var(--dash-surface-1);
          border: 1px solid var(--dash-border);
          border-radius: 12px;
          padding: 12px 16px;
          transition: background 0.15s, border-color 0.15s;
          min-width: 0;
        }
        .act-title {
          font-size: 14px;
          font-weight: 400;
          color: var(--dash-text-secondary);
          margin: 0 0 4px 0;
          line-height: 1.4;
          word-break: break-word;
          transition: color 0.15s;
        }
        .act-subtitle {
          font-size: 12px;
          color: var(--dash-text-secondary);
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
          flex-wrap: wrap;
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
          color: var(--dash-text-tertiary);
          flex-shrink: 0;
          margin-left: auto;
        }
        .act-attribution {
          font-size: 11px;
          color: var(--dash-text-tertiary);
          margin-top: 4px;
        }
        .act-lead-link {
          color: #64D2FF;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
        }
        .act-lead-link:hover {
          text-decoration: underline;
        }
        .act-status-arrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .act-status-badge {
          font-size: 11px;
          font-weight: 600;
          border-radius: 5px;
          padding: 2px 8px;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="act-root">

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Actividad reciente
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--dash-text-secondary)',
              margin: 0,
            }}
          >
            Ultimas acciones en el sistema
          </p>
        </div>

        {/* ── Filters + Timeline (client-side) ── */}
        <ActivityFilter initialActivities={items} />

        {/* ── Pagination ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            paddingTop: '8px',
            paddingBottom: '2rem',
          }}
        >
          {currentPage > 1 ? (
            <Link
              href={`/admin/actividad?page=${currentPage - 1}`}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid var(--dash-border)',
                background: 'var(--dash-surface-1)',
                color: 'var(--dash-text-primary)',
                textDecoration: 'none',
              }}
            >
              Anterior
            </Link>
          ) : (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid var(--dash-border)',
                color: 'var(--dash-text-tertiary)',
                cursor: 'default',
              }}
            >
              Anterior
            </span>
          )}

          <span style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)' }}>
            Pagina {currentPage}
          </span>

          {hasNextPage ? (
            <Link
              href={`/admin/actividad?page=${currentPage + 1}`}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid var(--dash-border)',
                background: 'var(--dash-surface-1)',
                color: 'var(--dash-text-primary)',
                textDecoration: 'none',
              }}
            >
              Siguiente
            </Link>
          ) : (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid var(--dash-border)',
                color: 'var(--dash-text-tertiary)',
                cursor: 'default',
              }}
            >
              Siguiente
            </span>
          )}
        </div>

      </div>
    </>
  )
}
