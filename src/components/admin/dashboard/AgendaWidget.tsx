import Link from 'next/link'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type CalendarEventType } from '@/lib/calendar/types'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export interface AgendaEvent {
  id: string
  title: string
  type: string
  event_date: string
  event_time: string | null
  project_title: string | null
  client_name: string | null
}

function fmtDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Widget de agenda operativa para el dashboard: próximas grabaciones, cobros y entregas. */
export function AgendaWidget({ events }: { events: AgendaEvent[] }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--dash-surface-1)',
        border: '1px solid var(--dash-border)',
        borderRadius: 16,
        padding: 20,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--dash-font-display)', fontSize: 20, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>
          Agenda
        </h2>
        <Link href="/admin/calendar" style={{ fontFamily: 'var(--dash-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dash-accent)', textDecoration: 'none' }}>
          Ver calendario
        </Link>
      </div>

      {events.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-text-tertiary)' }}>
          Sin eventos próximos. Agenda grabaciones, cobros o entregas desde el calendario.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((e, i) => {
            const type = e.type as CalendarEventType
            const color = EVENT_TYPE_COLORS[type] ?? '#8E8E93'
            const label = EVENT_TYPE_LABELS[type] ?? e.type
            const sub = [e.project_title, e.client_name].filter(Boolean).join(' · ')
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--dash-border)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 9, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color, fontWeight: 600 }}>{label}</span> · {e.title}
                  </p>
                  {sub && (
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub}
                    </p>
                  )}
                </div>
                <span style={{ flex: '0 0 auto', fontFamily: 'var(--dash-font-mono)', fontSize: 11, color: 'var(--dash-text-secondary)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {fmtDay(e.event_date)}{e.event_time ? ` ${e.event_time.slice(0, 5)}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
