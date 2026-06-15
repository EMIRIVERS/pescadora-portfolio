import { redirect } from 'next/navigation'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  type CalendarEventType,
} from '@/lib/calendar/types'
import {
  PortalShell,
  BackLink,
  Masthead,
  SectionLabel,
  EmptyState,
  PORTAL,
} from '@/components/portal/ui'

interface PortalEvent {
  id: string
  title: string
  type: CalendarEventType
  event_date: string
  event_time: string | null
  notes: string | null
  projects: { title: string } | null
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function monthKey(iso: string): string {
  const [y, m] = iso.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

function fmtDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })
}

interface PortalCalendarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PortalCalendarPage({ searchParams }: PortalCalendarPageProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId } = ctx

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data } = await sb
    .from('calendar_events')
    .select('id, title, type, event_date, event_time, notes, projects(title)')
    .eq('client_id', clientId)
    .order('event_date', { ascending: true })

  const events = (data ?? []) as PortalEvent[]

  // Agrupar por mes (preservando orden cronológico)
  const groups: { label: string; items: PortalEvent[] }[] = []
  for (const ev of events) {
    const label = monthKey(ev.event_date)
    let group = groups.find((g) => g.label === label)
    if (!group) {
      group = { label, items: [] }
      groups.push(group)
    }
    group.items.push(ev)
  }

  return (
    <PortalShell maxWidth={920}>
      <BackLink href={portalLink('/portal', ctx)} />

      <Masthead
        title="Calendario"
        lead="Fechas de grabación, entregas y cobros de tus proyectos, ordenadas mes a mes."
      />

      {events.length === 0 ? (
        <EmptyState
          title="Aún no hay fechas en el horizonte."
          body="Te avisaremos en cuanto agendemos grabaciones, entregas o cobros para tus producciones."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
          {groups.map((group, gi) => (
            <section key={group.label}>
              <SectionLabel index={String(gi + 1).padStart(2, '0')} style={{ marginBottom: '1.4rem' }}>
                {group.label}
              </SectionLabel>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.items.map((ev, ii) => (
                  <article
                    key={ev.id}
                    style={{
                      display: 'flex',
                      gap: 'clamp(1rem, 3vw, 1.6rem)',
                      alignItems: 'baseline',
                      padding: 'clamp(1.1rem, 2.5vw, 1.5rem) 0',
                      borderTop: ii === 0 ? `1px solid ${PORTAL.border}` : 'none',
                      borderBottom: `1px solid ${PORTAL.border}`,
                    }}
                  >
                    {/* Fecha en mono */}
                    <div style={{ flexShrink: 0, width: 'clamp(5.5rem, 14vw, 7.5rem)' }}>
                      <p
                        style={{
                          fontFamily: PORTAL.mono,
                          fontSize: '0.6rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: PORTAL.cream,
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {fmtDay(ev.event_date)}
                      </p>
                      {ev.event_time && (
                        <p
                          style={{
                            fontFamily: PORTAL.mono,
                            fontSize: '0.58rem',
                            letterSpacing: '0.14em',
                            color: PORTAL.dim,
                            margin: '0.35rem 0 0',
                          }}
                        >
                          {ev.event_time.slice(0, 5)}
                        </p>
                      )}
                    </div>

                    {/* Cuerpo */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="flex items-center gap-2"
                        style={{ marginBottom: '0.55rem' }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: EVENT_TYPE_COLORS[ev.type],
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: PORTAL.mono,
                            fontSize: '0.58rem',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: EVENT_TYPE_COLORS[ev.type],
                          }}
                        >
                          {EVENT_TYPE_LABELS[ev.type]}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontFamily: PORTAL.serif,
                          fontWeight: 500,
                          fontSize: 'clamp(1.25rem, 2.6vw, 1.7rem)',
                          lineHeight: 1.15,
                          letterSpacing: '-0.01em',
                          color: PORTAL.cream,
                          margin: 0,
                        }}
                      >
                        {ev.title}
                      </h3>

                      {ev.projects?.title && (
                        <p
                          style={{
                            fontFamily: PORTAL.mono,
                            fontSize: '0.6rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: PORTAL.muted,
                            margin: '0.6rem 0 0',
                          }}
                        >
                          {ev.projects.title}
                        </p>
                      )}

                      {ev.notes && (
                        <p
                          style={{
                            fontFamily: PORTAL.sans,
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                            color: PORTAL.muted,
                            margin: '0.7rem 0 0',
                            maxWidth: '40rem',
                          }}
                        >
                          {ev.notes}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PortalShell>
  )
}
