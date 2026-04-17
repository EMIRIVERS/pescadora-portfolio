import { createServiceClient } from '@/lib/supabase/server'
import CalendarView from '@/components/admin/CalendarView'
import type { CalendarProject, CalendarDeliverable, CalendarTask } from '@/components/admin/CalendarView'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            'var(--dash-bg)',
  surface1:      'var(--dash-surface-1)',
  border:        'var(--dash-border)',
  textPrimary:   'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CalendarPage() {
  const supabase = createServiceClient()

  const [
    { data: projectsRaw },
    { data: deliverablesRaw },
    { data: tasksRaw },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status, start_date, end_date')
      .order('end_date', { ascending: true }),
    supabase
      .from('project_deliverables')
      .select('id, title, status, due_date, project_id')
      .order('due_date', { ascending: true }),
    // Fetch tasks with due dates, joined to their board to get the project_id
    supabase
      .from('tasks')
      .select('id, title, priority, due_date, board_id, task_boards!inner(project_id)')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true }),
  ])

  const projects: CalendarProject[] = (projectsRaw ?? []) as CalendarProject[]
  const deliverables: CalendarDeliverable[] = (deliverablesRaw ?? []) as CalendarDeliverable[]

  // Build a project title lookup so tasks can show their project name
  const projectTitleMap = new Map<string, string>()
  for (const p of projects) projectTitleMap.set(p.id, p.title)

  type RawTask = {
    id: string
    title: string
    priority: string
    due_date: string
    board_id: string
    task_boards: { project_id: string | null }
  }

  const tasks: CalendarTask[] = ((tasksRaw ?? []) as RawTask[]).map((t) => {
    const projectId = t.task_boards?.project_id ?? null
    return {
      id:            t.id,
      title:         t.title,
      due_date:      t.due_date,
      priority:      t.priority,
      project_id:    projectId,
      project_title: projectId ? (projectTitleMap.get(projectId) ?? null) : null,
    }
  })

  const taskCount = tasks.length

  return (
    <div
      style={{
        padding: '0',
        background: T.bg,
        minHeight: '100vh',
        fontFamily: T.font,
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Calendario
        </h1>
        <p
          style={{
            marginTop: '6px',
            fontSize: '13px',
            color: T.textSecondary,
            margin: '6px 0 0',
          }}
        >
          {projects.length} proyecto{projects.length !== 1 ? 's' : ''},{' '}
          {deliverables.length} entregable{deliverables.length !== 1 ? 's' : ''},{' '}
          {taskCount} tarea{taskCount !== 1 ? 's' : ''} con fecha
        </p>
      </div>

      {/* Calendar card */}
      <div
        style={{
          background: T.surface1,
          borderRadius: '16px',
          border: `1px solid ${T.border}`,
          padding: '24px',
        }}
      >
        <CalendarView projects={projects} deliverables={deliverables} tasks={tasks} />
      </div>
    </div>
  )
}
