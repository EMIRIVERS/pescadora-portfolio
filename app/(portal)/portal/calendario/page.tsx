import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  type CalendarEventType,
} from '@/lib/calendar/types'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

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
    <main style={{ fontFamily: FONT, minHeight: '100vh', backgroundColor: 'var(--portal-bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)' }}>
        <Link
          href={portalLink('/portal', ctx)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--portal-text-muted)', textDecoration: 'none', marginBottom: '2rem' }}
        >
          <span>&larr;</span>
          <span>Inicio</span>
        </Link>

        <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--portal-text)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Calendario
        </h1>
        <p style={{ fontSize: 14, color: 'var(--portal-text-muted)', margin: '0 0 2rem' }}>
          Fechas de grabación, entregas y cobros de tus proyectos.
        </p>

        {events.length === 0 ? (
          <div style={{ marginTop: '1rem', backgroundColor: 'var(--portal-surface)', border: '1px solid var(--portal-border)', borderRadius: 16, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--portal-text-muted)' }}>
              Aún no hay fechas programadas. Te avisaremos en cuanto agendemos algo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {groups.map((group) => (
              <section key={group.label}>
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--portal-text-muted)', margin: '0 0 12px' }}>
                  {group.label}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.items.map((ev) => (
                    <div key={ev.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', backgroundColor: 'var(--portal-surface)', border: '1px solid var(--portal-border)', borderRadius: 14, padding: '14px 16px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 10, background: EVENT_TYPE_COLORS[ev.type], marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: EVENT_TYPE_COLORS[ev.type], textTransform: 'uppercase' }}>
                            {EVENT_TYPE_LABELS[ev.type]}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--portal-text-muted)', textTransform: 'capitalize' }}>
                            {fmtDay(ev.event_date)}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--portal-text)' }}>{ev.title}</p>
                        {ev.projects?.title && (
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--portal-text-muted)' }}>{ev.projects.title}</p>
                        )}
                        {ev.notes && (
                          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--portal-text-muted)', lineHeight: 1.5 }}>{ev.notes}</p>
                        )}
                      </div>
                    </div>
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
