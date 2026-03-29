import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Deliverable, DeliverableStatus, DeliverableType, Project } from '@/lib/supabase/types'
// Note: deliverables are fetched flat and joined to projects in memory.
import DeliverableCard from '@/components/portal/deliverable-card'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = 'todos' | 'wip' | 'finales' | 'aprobados'

interface ProjectGroup {
  project: Pick<Project, 'id' | 'title'>
  deliverables: Deliverable[]
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'wip', label: 'WIP' },
  { key: 'finales', label: 'Finales' },
  { key: 'aprobados', label: 'Aprobados' },
]

function matchesFilter(deliverable: Deliverable, filter: FilterTab): boolean {
  if (filter === 'todos') return true
  if (filter === 'wip') return deliverable.type === ('wip' satisfies DeliverableType)
  if (filter === 'finales') return deliverable.type === ('final' satisfies DeliverableType)
  if (filter === 'aprobados') return deliverable.status === ('approved' satisfies DeliverableStatus)
  return true
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function DeliverablesPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { filter: rawFilter } = await searchParams
  const activeFilter: FilterTab =
    rawFilter === 'wip' || rawFilter === 'finales' || rawFilter === 'aprobados'
      ? rawFilter
      : 'todos'

  // Resolve the client record linked to this user's profile
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('profile_id', user.id)
    .single()

  if (!client) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <PageHeader />
          <EmptyState message="No tienes una cuenta de cliente activa." />
        </div>
      </main>
    )
  }

  // Fetch all projects for this client
  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, title')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const projects = (projectRows ?? []) as Pick<Project, 'id' | 'title'>[]
  const projectIds = projects.map((p) => p.id)

  // Fetch all deliverables across all projects in one query
  const { data: deliverableRows } = projectIds.length
    ? await supabase
        .from('project_deliverables')
        .select('*')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true })
    : { data: null }

  const allDeliverables = (deliverableRows ?? []) as Deliverable[]

  // Apply filter
  const filtered = allDeliverables.filter((d) => matchesFilter(d, activeFilter))

  // Group by project, preserving project order
  const groups: ProjectGroup[] = projects
    .map((project) => ({
      project,
      deliverables: filtered.filter((d) => d.project_id === project.id),
    }))
    .filter((g) => g.deliverables.length > 0)

  const totalFiltered = filtered.length

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        <PageHeader />

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 mb-8 flex-wrap">
          {FILTER_TABS.map(({ key, label }) => {
            const isActive = key === activeFilter
            const href =
              key === 'todos' ? '/portal/deliverables' : `/portal/deliverables?filter=${key}`
            return (
              <Link
                key={key}
                href={href}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-zinc-950 border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {label}
              </Link>
            )
          })}

          {totalFiltered > 0 && (
            <span className="ml-auto text-zinc-600 text-xs">
              {totalFiltered} entregable{totalFiltered !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Content */}
        {groups.length === 0 ? (
          <EmptyState
            message={
              activeFilter === 'todos'
                ? 'Los entregables apareceran aqui cuando esten listos.'
                : 'No hay entregables que coincidan con este filtro.'
            }
          />
        ) : (
          <div className="space-y-10">
            {groups.map(({ project, deliverables }) => (
              <section key={project.id}>
                {/* Project section header */}
                <div className="flex items-center gap-3 mb-4">
                  <Link
                    href={`/portal/projects/${project.id}`}
                    className="text-zinc-300 text-sm font-medium hover:text-white transition-colors"
                  >
                    {project.title}
                  </Link>
                  <span className="text-zinc-700 text-xs">
                    {deliverables.length} entregable{deliverables.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px bg-zinc-800" />
                  <Link
                    href={`/portal/projects/${project.id}`}
                    className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                  >
                    Ver proyecto &rarr;
                  </Link>
                </div>

                <div className="space-y-3">
                  {deliverables.map((deliverable) => (
                    <DeliverableCard key={deliverable.id} deliverable={deliverable} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div className="mb-8">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors mb-6"
      >
        <span>&larr;</span>
        <span>Mis proyectos</span>
      </Link>
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Portal de cliente</p>
      <h1 className="text-white text-2xl sm:text-3xl font-semibold">Entregables</h1>
      <p className="text-zinc-400 mt-2 text-sm">
        Todos los archivos y materiales de tus proyectos.
      </p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-zinc-800 rounded-xl p-12 text-center">
      <p className="text-zinc-500 text-sm">{message}</p>
      <a
        href="mailto:hola@pescadora.mx"
        className="inline-block mt-4 text-sky-400 hover:text-sky-300 text-sm transition-colors"
      >
        Contactar a Pescadora
      </a>
    </div>
  )
}

