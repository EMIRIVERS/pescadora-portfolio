import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { Deliverable, Project, ProjectStatus } from '@/lib/supabase/types'
import ProjectTimeline from '@/components/portal/project-timeline'
import DeliverableCard from '@/components/portal/deliverable-card'
import ClientUploader from '@/components/portal/ClientUploader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ProjectStatus,
  { border: string; text: string; label: string }
> = {
  pre_production: {
    border: 'border-amber-800/50',
    text: 'text-amber-400',
    label: 'Pre-produccion',
  },
  production: {
    border: 'border-sky-800/50',
    text: 'text-sky-400',
    label: 'En produccion',
  },
  post_production: {
    border: 'border-violet-800/50',
    text: 'text-violet-400',
    label: 'Post-produccion',
  },
  delivered: {
    border: 'border-emerald-800/50',
    text: 'text-emerald-400',
    label: 'Entregado',
  },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId, clientName, isAdminPreview } = ctx
  const client = { id: clientId, name: clientName }

  const { id } = await params

  // Fetch the project — must belong to this client
  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('client_id', client.id)
    .single()

  if (projectError || !projectRow) {
    notFound()
  }

  const project = projectRow as unknown as Project

  // Fetch deliverables
  const { data: deliverableRows } = await supabase
    .from('project_deliverables')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })

  const deliverables: Deliverable[] = (deliverableRows ?? []) as Deliverable[]
  const approvedCount = deliverables.filter((d) => d.status === 'approved').length

  // Fetch revision counts for each deliverable to show the current version badge
  const revisionCountMap: Record<string, number> = {}
  if (deliverables.length > 0) {
    const deliverableIds = deliverables.map((d) => d.id)
    const { data: revisionRows } = await supabase
      .from('deliverable_revisions')
      .select('deliverable_id')
      .in('deliverable_id', deliverableIds)

    for (const row of revisionRows ?? []) {
      const rid = (row as { deliverable_id: string }).deliverable_id
      revisionCountMap[rid] = (revisionCountMap[rid] ?? 0) + 1
    }
  }

  const statusCfg = STATUS_CONFIG[project.status]

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link
          href={portalLink('/portal', ctx)}
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors mb-8"
        >
          <span>&larr;</span>
          <span>Mis proyectos</span>
        </Link>

        {/* Project header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            <h1 className="text-white text-2xl sm:text-3xl font-semibold leading-snug flex-1">
              {project.title}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-zinc-950 ${statusCfg.border} ${statusCfg.text} shrink-0 mt-1`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {statusCfg.label}
            </span>
          </div>

          {project.description && (
            <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
              {project.description}
            </p>
          )}

          {/* Dates row */}
          {(project.start_date || project.end_date) && (
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-zinc-500">
              {project.start_date && (
                <span>
                  Inicio:{' '}
                  <span className="text-zinc-300">{formatDate(project.start_date)}</span>
                </span>
              )}
              {project.end_date && (
                <span>
                  Entrega estimada:{' '}
                  <span className="text-zinc-300">{formatDate(project.end_date)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Production timeline */}
        <section className="mb-12">
          <h2 className="text-zinc-300 text-xs font-medium uppercase tracking-widest mb-5">
            Timeline de produccion
          </h2>
          <ProjectTimeline currentStatus={project.status} />
        </section>

        {/* Deliverables */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-zinc-300 text-xs font-medium uppercase tracking-widest">
              Entregables
            </h2>
            {deliverables.length > 0 && (
              <span className="text-zinc-500 text-xs">
                {approvedCount} / {deliverables.length} aprobados
              </span>
            )}
          </div>

          {deliverables.length === 0 ? (
            <div className="border border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-zinc-500 text-sm">
                Los entregables apareceran aqui cuando esten listos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliverables.map((deliverable) => (
                <DeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  revisionCount={revisionCountMap[deliverable.id] ?? 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* Client uploads */}
        <section>
          <h2 className="text-zinc-300 text-xs font-medium uppercase tracking-widest mb-5">
            Tus archivos
          </h2>
          {isAdminPreview ? (
            <div className="border border-amber-900/40 bg-amber-950/20 rounded-xl p-6 text-amber-300 text-sm">
              Subida de archivos deshabilitada en modo preview.
            </div>
          ) : (
            <ClientUploader projectId={project.id} clientId={client.id} />
          )}
        </section>
      </div>
    </main>
  )
}
