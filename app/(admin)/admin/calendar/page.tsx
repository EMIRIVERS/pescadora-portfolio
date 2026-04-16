import { createServiceClient } from '@/lib/supabase/server'
import CalendarView from '@/components/admin/CalendarView'
import type { CalendarProject, CalendarDeliverable } from '@/components/admin/CalendarView'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            '#000000',
  surface1:      '#111111',
  border:        'rgba(255,255,255,0.08)',
  textPrimary:   '#F5F5F7',
  textSecondary: '#86868B',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CalendarPage() {
  const supabase = createServiceClient()

  const [{ data: projectsRaw }, { data: deliverablesRaw }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status, start_date, end_date')
      .order('end_date', { ascending: true }),
    supabase
      .from('project_deliverables')
      .select('id, title, status, due_date, project_id')
      .order('due_date', { ascending: true }),
  ])

  const projects: CalendarProject[] = (projectsRaw ?? []) as CalendarProject[]
  const deliverables: CalendarDeliverable[] = (deliverablesRaw ?? []) as CalendarDeliverable[]

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
          {deliverables.length} entregable{deliverables.length !== 1 ? 's' : ''}
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
        <CalendarView projects={projects} deliverables={deliverables} />
      </div>
    </div>
  )
}
