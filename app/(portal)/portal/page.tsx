import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { ProjectWithClient, ProjectStatus } from '@/lib/supabase/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type CalendarEventType } from '@/lib/calendar/types'

interface UpcomingEvent {
  id: string
  title: string
  type: CalendarEventType
  event_date: string
}

function fmtShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ProjectStatus,
  { dot: string; text: string; label: string }
> = {
  pre_production: { dot: 'bg-amber-500', text: 'text-amber-400', label: 'Pre-produccion' },
  production: { dot: 'bg-sky-500', text: 'text-sky-400', label: 'Produccion' },
  post_production: { dot: 'bg-violet-500', text: 'text-violet-400', label: 'Post-produccion' },
  delivered: { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Entregado' },
}

const PHASE_ORDER: ProjectStatus[] = [
  'pre_production',
  'production',
  'post_production',
  'delivered',
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PortalDashboardProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PortalDashboard({ searchParams }: PortalDashboardProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) {
    // Usuario autenticado pero sin row en clients → mandar al login para reintentar.
    redirect('/login')
  }
  const { supabase, clientId, clientName } = ctx
  const client = { id: clientId, name: clientName }

  // Fetch all projects for this client
  const { data: projectRows } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const projects: ProjectWithClient[] = (projectRows ?? []) as ProjectWithClient[]

  // Deliverable approval counts per project (for progress bars)
  const projectIds = projects.map((p) => p.id)
  const { data: deliverableRows } = projectIds.length
    ? await supabase
        .from('project_deliverables')
        .select('project_id, status')
        .in('project_id', projectIds)
    : { data: null }

  type DeliverableRow = { project_id: string; status: string }
  const deliverables: DeliverableRow[] = (deliverableRows ?? []) as DeliverableRow[]

  function deliverableProgress(projectId: string): { done: number; total: number } {
    const rows = deliverables.filter((d) => d.project_id === projectId)
    return { done: rows.filter((d) => d.status === 'approved').length, total: rows.length }
  }

  // Próximas fechas del calendario operativo (filtro explícito client_id + RLS).
  const today = new Date().toISOString().slice(0, 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventRows } = await (supabase as any)
    .from('calendar_events')
    .select('id, title, type, event_date')
    .eq('client_id', client.id)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(4)
  const upcoming = (eventRows ?? []) as UpcomingEvent[]

  const displayName = clientName ?? 'Cliente'
  const firstName = displayName.split(/\s/)[0]

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        {/* Greeting */}
        <div className="mb-10">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
            Portal de cliente
          </p>
          <h1 className="text-white text-3xl font-semibold">
            Hola, {firstName}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            {projects.length === 0
              ? 'No tienes proyectos activos todavia.'
              : `Tienes ${projects.length} proyecto${projects.length !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Próximas fechas + acceso a rendimiento */}
        {upcoming.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-zinc-300 text-sm font-medium">Próximas fechas</h2>
              <div className="flex items-center gap-3">
                <Link href={portalLink('/portal/calendario', ctx)} className="text-sky-400 hover:text-sky-300 text-xs">
                  Ver calendario
                </Link>
                <Link href={portalLink('/portal/rendimiento', ctx)} className="text-sky-400 hover:text-sky-300 text-xs">
                  Mi rendimiento
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((ev) => (
                <Link
                  key={ev.id}
                  href={portalLink('/portal/calendario', ctx)}
                  className="border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: EVENT_TYPE_COLORS[ev.type] }} />
                    <span className="text-xs uppercase tracking-wide" style={{ color: EVENT_TYPE_COLORS[ev.type] }}>
                      {EVENT_TYPE_LABELS[ev.type]}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-zinc-500 text-xs mt-1 capitalize">{fmtShortDate(ev.event_date)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Project cards */}
        {projects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {projects.map((project) => {
              const cfg = STATUS_CONFIG[project.status]
              const phaseIndex = PHASE_ORDER.indexOf(project.status)
              const { done, total } = deliverableProgress(project.id)
              const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <Link
                  key={project.id}
                  href={portalLink(`/portal/projects/${project.id}`, ctx)}
                  className="group block bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <h2 className="text-white font-medium text-lg leading-snug group-hover:text-sky-100 transition-colors">
                      {project.title}
                    </h2>
                    <span
                      className={`flex items-center gap-1.5 shrink-0 text-xs font-medium ${cfg.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Phase mini-timeline */}
                  <div className="flex items-center gap-1 mb-4" aria-label="Fases del proyecto">
                    {PHASE_ORDER.map((phase, i) => {
                      const isDone = i < phaseIndex
                      const isCurrent = i === phaseIndex
                      return (
                        <div key={phase} className="flex-1 h-1.5 rounded-full overflow-hidden bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isDone
                                ? 'bg-sky-700 w-full'
                                : isCurrent
                                ? 'bg-sky-400 w-full'
                                : 'w-0'
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-3">
                    {total > 0 ? (
                      <span>
                        {done} / {total} entregable{total !== 1 ? 's' : ''} aprobado{done !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span>Sin entregables aun</span>
                    )}
                    <span className="text-zinc-400 group-hover:text-white transition-colors font-medium">
                      Ver detalle &rarr;
                    </span>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-500 text-sm">
              Cuando tu proyecto este en marcha aparecera aqui.
            </p>
            <a
              href="mailto:hola@xicofilms.com"
              className="inline-block mt-4 text-sky-400 hover:text-sky-300 text-sm transition-colors"
            >
              Contactar a XICO Films
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
