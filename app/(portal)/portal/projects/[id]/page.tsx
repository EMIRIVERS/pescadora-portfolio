import { notFound, redirect } from 'next/navigation'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { Deliverable, Project, ProjectStatus } from '@/lib/supabase/types'
import ProjectTimeline from '@/components/portal/project-timeline'
import DeliverableCard from '@/components/portal/deliverable-card'
import ClientUploader from '@/components/portal/ClientUploader'
import { PortalShell, BackLink, SectionLabel, StatusTag, EmptyState, PORTAL } from '@/components/portal/ui'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ProjectStatus,
  { color: string; label: string }
> = {
  pre_production: { color: '#f5a623', label: 'Pre-producción' },
  production: { color: '#5ac8fa', label: 'Producción' },
  post_production: { color: '#bf5af2', label: 'Post-producción' },
  delivered: { color: '#30d158', label: 'Entregado' },
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
  const hasDates = Boolean(project.start_date || project.end_date)

  return (
    <PortalShell maxWidth={1000}>
      <BackLink href={portalLink('/portal', ctx)} label="Mis proyectos" />

      {/* ── Masthead ── */}
      <header style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1
            style={{
              fontFamily: PORTAL.serif,
              fontWeight: 400,
              fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.01em',
              color: PORTAL.cream,
              margin: 0,
              flex: '1 1 18rem',
            }}
          >
            {project.title}
          </h1>
          <div style={{ paddingTop: '0.7rem' }}>
            <StatusTag color={statusCfg.color}>{statusCfg.label}</StatusTag>
          </div>
        </div>

        {project.description && (
          <p
            style={{
              fontFamily: PORTAL.sans,
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: PORTAL.muted,
              margin: '1.4rem 0 0',
              maxWidth: '42rem',
            }}
          >
            {project.description}
          </p>
        )}

        {/* Dates row */}
        {hasDates && (
          <div
            className="flex flex-wrap"
            style={{ gap: '2.5rem', marginTop: '1.8rem' }}
          >
            {project.start_date && (
              <div>
                <p style={{ fontFamily: PORTAL.mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: PORTAL.dim, margin: 0 }}>
                  Inicio
                </p>
                <p style={{ fontFamily: PORTAL.serif, fontStyle: 'italic', fontSize: '1.15rem', color: PORTAL.cream, margin: '0.4rem 0 0' }}>
                  {formatDate(project.start_date)}
                </p>
              </div>
            )}
            {project.end_date && (
              <div>
                <p style={{ fontFamily: PORTAL.mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: PORTAL.dim, margin: 0 }}>
                  Entrega estimada
                </p>
                <p style={{ fontFamily: PORTAL.serif, fontStyle: 'italic', fontSize: '1.15rem', color: PORTAL.cream, margin: '0.4rem 0 0' }}>
                  {formatDate(project.end_date)}
                </p>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── 01 · Timeline de producción ── */}
      <section style={{ marginBottom: 'clamp(3rem, 6vw, 4rem)' }}>
        <SectionLabel index="01" style={{ marginBottom: '1.4rem' }}>
          Timeline de producción
        </SectionLabel>
        <ProjectTimeline currentStatus={project.status} />
      </section>

      {/* ── 02 · Entregables ── */}
      <section style={{ marginBottom: 'clamp(3rem, 6vw, 4rem)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.4rem' }}>
          <SectionLabel index="02">Entregables</SectionLabel>
          {deliverables.length > 0 && (
            <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: PORTAL.dim }}>
              {approvedCount} / {deliverables.length} aprobado{approvedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {deliverables.length === 0 ? (
          <EmptyState
            title="Aún no hay entregables."
            body="Los entregables aparecerán aquí en cuanto estén listos para tu revisión."
            ctaLabel=""
          />
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

      {/* ── 03 · Tus archivos ── */}
      <section>
        <SectionLabel index="03" style={{ marginBottom: '1.4rem' }}>
          Tus archivos
        </SectionLabel>
        {isAdminPreview ? (
          <div
            style={{
              border: `1px solid rgba(245,166,35,0.3)`,
              borderRadius: '6px',
              padding: '1.4rem 1.5rem',
              fontFamily: PORTAL.sans,
              fontSize: '0.88rem',
              lineHeight: 1.6,
              color: '#f5a623',
            }}
          >
            Subida de archivos deshabilitada en modo preview.
          </div>
        ) : (
          <ClientUploader projectId={project.id} clientId={client.id} />
        )}
      </section>
    </PortalShell>
  )
}
