import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ProjectWithClient, ProjectStatus } from '@/lib/supabase/types'

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

export default async function PortalDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Resolve the client record linked to this user's profile
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('profile_id', user.id)
    .single()

  // Fetch all projects for this client
  const { data: projectRows } = client
    ? await supabase
        .from('projects')
        .select('*, client:clients(*)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
    : { data: null }

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

  const clientName = client?.name ?? user.email ?? 'Cliente'
  const firstName = clientName.split(/\s|@/)[0]

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
                  href={`/portal/projects/${project.id}`}
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
              href="mailto:hola@pescadora.mx"
              className="inline-block mt-4 text-sky-400 hover:text-sky-300 text-sm transition-colors"
            >
              Contactar a Pescadora
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
