import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { Deliverable, DeliverableStatus, DeliverableType, Project } from '@/lib/supabase/types'
// Note: deliverables are fetched flat and joined to projects in memory.
import DeliverableCard from '@/components/portal/deliverable-card'
import { PortalShell, BackLink, Masthead, EmptyState, PORTAL } from '@/components/portal/ui'

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
  searchParams: Promise<{ filter?: string; as_client?: string }>
}

export default async function DeliverablesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId, clientName } = ctx
  const client = { id: clientId, name: clientName }

  const rawFilter = sp.filter
  const activeFilter: FilterTab =
    rawFilter === 'wip' || rawFilter === 'finales' || rawFilter === 'aprobados'
      ? rawFilter
      : 'todos'

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
    <PortalShell maxWidth={920}>
      <BackLink href={portalLink('/portal', ctx)} label="Mis proyectos" />

      <Masthead
        title="Entregables"
        lead="Todos los archivos y materiales de tus proyectos, organizados por producción."
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 'clamp(2rem, 4vw, 2.75rem)' }}>
        {FILTER_TABS.map(({ key, label }) => {
          const isActive = key === activeFilter
          const baseHref = key === 'todos' ? '/portal/deliverables' : `/portal/deliverables?filter=${key}`
          const href = portalLink(baseHref, ctx)
          return (
            <Link
              key={key}
              href={href}
              className={`portal-tab${isActive ? ' portal-tab--active' : ''}`}
            >
              {label}
            </Link>
          )
        })}

        {totalFiltered > 0 && (
          <span
            className="ml-auto"
            style={{ fontFamily: PORTAL.mono, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: PORTAL.dim }}
          >
            {totalFiltered} entregable{totalFiltered !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {groups.length === 0 ? (
        <EmptyState
          title={
            activeFilter === 'todos'
              ? 'Aún no hay entregables.'
              : 'Sin coincidencias.'
          }
          body={
            activeFilter === 'todos'
              ? 'Los entregables aparecerán aquí cuando estén listos para tu revisión.'
              : 'No hay entregables que coincidan con este filtro.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
          {groups.map(({ project, deliverables }) => (
            <section key={project.id}>
              {/* Project section header */}
              <div className="flex items-center gap-4" style={{ marginBottom: '1.4rem' }}>
                <Link
                  href={portalLink(`/portal/projects/${project.id}`, ctx)}
                  className="portal-textlink"
                  style={{ fontFamily: PORTAL.serif, fontWeight: 500, fontSize: 'clamp(1.25rem, 2.4vw, 1.6rem)', lineHeight: 1.1, letterSpacing: '-0.01em', color: PORTAL.cream }}
                >
                  {project.title}
                </Link>
                <span
                  className="shrink-0"
                  style={{ fontFamily: PORTAL.mono, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: PORTAL.dim }}
                >
                  {deliverables.length} entregable{deliverables.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1" style={{ height: '1px', background: PORTAL.border }} />
                <Link
                  href={portalLink(`/portal/projects/${project.id}`, ctx)}
                  className="portal-textlink shrink-0"
                  style={{ fontFamily: PORTAL.mono, fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}
                >
                  Ver proyecto &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {deliverables.map((deliverable) => (
                  <DeliverableCard key={deliverable.id} deliverable={deliverable} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PortalShell>
  )
}
