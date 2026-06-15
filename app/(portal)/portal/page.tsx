import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { ProjectWithClient, ProjectStatus } from '@/lib/supabase/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type CalendarEventType } from '@/lib/calendar/types'
import {
  PortalShell,
  Masthead,
  SectionLabel,
  EmptyState,
  PROJECT_STATUS_CONFIG,
  PORTAL,
} from '@/components/portal/ui'

interface UpcomingEvent {
  id: string
  title: string
  type: CalendarEventType
  event_date: string
}

function fmtShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
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

  const projectsSectionIndex = upcoming.length > 0 ? '02' : '01'

  return (
    <PortalShell maxWidth={1152}>
      {/* ── Masthead ── */}
      <Masthead
        title="Hola,"
        accent={firstName}
        lead={
          projects.length === 0
            ? 'Aún no tienes producciones activas. En cuanto arranquemos, el detalle de cada proyecto vivirá aquí.'
            : `Tienes ${projects.length} producci${projects.length !== 1 ? 'ones' : 'ón'} en curso. Sigue cada fase, aprueba entregables y revisa fechas clave.`
        }
      />

      {/* ── 01 · Próximas fechas ── */}
      {upcoming.length > 0 && (
        <section style={{ marginBottom: 'clamp(3rem, 6vw, 4.5rem)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1.4rem' }}>
            <SectionLabel index="01">Próximas fechas</SectionLabel>
            <div className="flex items-center gap-5">
              <Link href={portalLink('/portal/calendario', ctx)} className="portal-textlink" style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Calendario
              </Link>
              <Link href={portalLink('/portal/rendimiento', ctx)} className="portal-textlink" style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Rendimiento
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((ev) => (
              <Link
                key={ev.id}
                href={portalLink('/portal/calendario', ctx)}
                className="portal-card"
                style={{ borderRadius: '6px', padding: '1.1rem 1.2rem', display: 'block' }}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: '0.7rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: EVENT_TYPE_COLORS[ev.type] }} />
                  <span style={{ fontFamily: PORTAL.mono, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: EVENT_TYPE_COLORS[ev.type] }}>
                    {EVENT_TYPE_LABELS[ev.type]}
                  </span>
                </div>
                <p className="portal-card-title" style={{ fontFamily: PORTAL.sans, fontSize: '0.9rem', fontWeight: 500, color: PORTAL.cream, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</p>
                <p style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', color: PORTAL.dim, margin: '0.5rem 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{fmtShortDate(ev.event_date)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Producciones ── */}
      {projects.length > 0 && (
        <section>
          <div style={{ marginBottom: '1.6rem' }}>
            <SectionLabel index={projectsSectionIndex}>Tus producciones</SectionLabel>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => {
              const cfg = PROJECT_STATUS_CONFIG[project.status]
              const phaseIndex = PHASE_ORDER.indexOf(project.status)
              const { done, total } = deliverableProgress(project.id)
              const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <Link
                  key={project.id}
                  href={portalLink(`/portal/projects/${project.id}`, ctx)}
                  className="portal-card"
                  style={{ borderRadius: '6px', padding: 'clamp(1.5rem, 3vw, 2rem)', display: 'block' }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4" style={{ marginBottom: '1.6rem' }}>
                    <h2 className="portal-card-title" style={{ fontFamily: PORTAL.serif, fontWeight: 500, fontSize: 'clamp(1.4rem, 2.6vw, 1.85rem)', lineHeight: 1.12, letterSpacing: '-0.01em', color: PORTAL.cream, margin: 0, transition: 'color 0.3s ease' }}>
                      {project.title}
                    </h2>
                    <span className="flex items-center gap-2 shrink-0" style={{ fontFamily: PORTAL.mono, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: cfg.color, paddingTop: '0.5rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Phase mini-timeline */}
                  <div className="flex items-center gap-1.5" style={{ marginBottom: '1.5rem' }} aria-label="Fases del proyecto">
                    {PHASE_ORDER.map((phase, i) => {
                      const isDone = i < phaseIndex
                      const isCurrent = i === phaseIndex
                      return (
                        <div key={phase} style={{ flex: 1, height: '2px', background: 'rgba(237,232,224,0.1)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: isDone || isCurrent ? '100%' : '0%', background: isCurrent ? PORTAL.accent : isDone ? 'rgba(232,52,26,0.45)' : 'transparent' }} />
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between" style={{ fontFamily: PORTAL.mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: PORTAL.dim }}>
                    {total > 0 ? (
                      <span>{done} / {total} entregable{total !== 1 ? 's' : ''} aprobado{done !== 1 ? 's' : ''}</span>
                    ) : (
                      <span>Sin entregables aún</span>
                    )}
                    <span className="portal-card-cta" style={{ color: PORTAL.muted, transition: 'color 0.3s ease' }}>
                      Ver detalle &nbsp;&rarr;
                    </span>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div style={{ marginTop: '0.9rem', height: '1px', background: 'rgba(237,232,224,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: PORTAL.accent }} />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {projects.length === 0 && (
        <EmptyState
          title="Tu próxima producción empieza aquí."
          body="Cuando tu proyecto esté en marcha, aparecerá en este espacio con todas sus fases y entregables."
        />
      )}
    </PortalShell>
  )
}
