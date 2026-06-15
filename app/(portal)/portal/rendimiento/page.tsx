import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type CalendarEventType } from '@/lib/calendar/types'
import {
  PortalShell,
  BackLink,
  Masthead,
  SectionLabel,
  EmptyState,
  PORTAL,
} from '@/components/portal/ui'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface InvoiceRow {
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  paid_at: string | null
}
interface EventRow {
  type: CalendarEventType
  event_date: string
  status: 'pendiente' | 'hecho'
}

function money(n: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

/** Mes activo desde ?m=YYYY-MM, default mes actual. */
function resolveMonth(m: string | undefined): { year: number; month: number } {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split('-').map(Number)
    return { year: y, month: mo - 1 }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function inMonth(iso: string | null, year: number, month: number): boolean {
  if (!iso) return false
  const [y, m] = iso.slice(0, 10).split('-').map(Number)
  return y === year && m - 1 === month
}

export default async function PortalPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; as_client?: string }>
}) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId, clientName } = ctx
  const client = { id: clientId, name: clientName }

  const { year, month } = resolveMonth(sp.m)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: invRaw }, { data: evRaw }] = await Promise.all([
    sb.from('invoices').select('amount, currency, status, issue_date, paid_at').eq('client_id', client.id),
    sb.from('calendar_events').select('type, event_date, status').eq('client_id', client.id),
  ])

  const invoices = (invRaw ?? []) as InvoiceRow[]
  const events = (evRaw ?? []) as EventRow[]

  // ── Métricas del mes ──
  const cobrado = invoices
    .filter((i) => i.status === 'paid' && inMonth(i.paid_at ?? i.issue_date, year, month))
    .reduce((s, i) => s + Number(i.amount), 0)

  const porCobrar = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.amount), 0)

  const monthEvents = events.filter((e) => inMonth(e.event_date, year, month))
  const hitosTotal = monthEvents.length
  const hitosHechos = monthEvents.filter((e) => e.status === 'hecho').length
  const cumplimiento = hitosTotal > 0 ? Math.round((hitosHechos / hitosTotal) * 100) : 0

  // Conteo por tipo de hito
  const byType = new Map<CalendarEventType, { total: number; done: number }>()
  for (const e of monthEvents) {
    const cur = byType.get(e.type) ?? { total: 0, done: 0 }
    cur.total += 1
    if (e.status === 'hecho') cur.done += 1
    byType.set(e.type, cur)
  }

  const currency = invoices[0]?.currency ?? 'MXN'
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 }
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 }

  const monthLabel = `${MONTHS[month]} ${year}`

  const navLink: React.CSSProperties = {
    fontFamily: PORTAL.mono,
    fontSize: '0.62rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  }

  // ── Tarjeta de estadística (etiqueta mono + cifra serif grande) ──
  function Stat({
    label,
    value,
    valueColor = PORTAL.cream,
    sub,
  }: {
    label: string
    value: React.ReactNode
    valueColor?: string
    sub?: React.ReactNode
  }) {
    return (
      <div className="portal-card" style={{ borderRadius: '6px', padding: 'clamp(1.4rem, 3vw, 1.8rem)' }}>
        <p style={{ fontFamily: PORTAL.mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: PORTAL.dim, margin: 0 }}>
          {label}
        </p>
        <p style={{ fontFamily: PORTAL.serif, fontWeight: 400, fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.05, letterSpacing: '-0.01em', color: valueColor, margin: '0.7rem 0 0', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontFamily: PORTAL.mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: PORTAL.muted, margin: '0.6rem 0 0' }}>
            {sub}
          </p>
        )}
      </div>
    )
  }

  return (
    <PortalShell maxWidth={1000}>
      <BackLink href={portalLink('/portal', ctx)} />

      <Masthead
        title="Rendimiento"
        lead="Resumen de tu mes con XICO Films: lo cobrado, lo pendiente y el avance de los hitos clave de tu producción."
      />

      {/* ── 01 · Periodo ── */}
      <section style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.4rem' }}>
          <SectionLabel index="01">Periodo</SectionLabel>
          <div className="flex items-center gap-5">
            <Link href={`/portal/rendimiento?m=${monthParam(prev.y, prev.m)}`} className="portal-textlink" style={navLink}>
              <span aria-hidden="true">&larr;</span> Anterior
            </Link>
            <Link href={`/portal/rendimiento?m=${monthParam(next.y, next.m)}`} className="portal-textlink" style={navLink}>
              Siguiente <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
        <p style={{ fontFamily: PORTAL.serif, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', lineHeight: 1.1, color: PORTAL.cream, margin: 0 }}>
          {monthLabel}
        </p>
      </section>

      {/* ── 02 · Métricas ── */}
      <section style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
        <div style={{ marginBottom: '1.6rem' }}>
          <SectionLabel index="02">Métricas del mes</SectionLabel>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Cobrado este mes" value={money(cobrado, currency)} />
          <Stat label="Por cobrar (total)" value={money(porCobrar, currency)} valueColor={PORTAL.accent} />
          <Stat
            label="Hitos cumplidos"
            value={
              <>
                {hitosHechos}
                <span style={{ fontSize: '0.5em', color: PORTAL.muted }}> / {hitosTotal}</span>
              </>
            }
            sub={`${cumplimiento}% de cumplimiento`}
          />
        </div>
        {hitosTotal > 0 && (
          <div style={{ marginTop: '1rem', height: '2px', background: 'rgba(237,232,224,0.1)', overflow: 'hidden', borderRadius: '2px' }} aria-label={`Cumplimiento ${cumplimiento}%`}>
            <div style={{ height: '100%', width: `${cumplimiento}%`, background: PORTAL.accent }} />
          </div>
        )}
      </section>

      {/* ── 03 · Actividad ── */}
      <section>
        <div style={{ marginBottom: '1.6rem' }}>
          <SectionLabel index="03">Actividad del mes</SectionLabel>
        </div>
        {monthEvents.length === 0 ? (
          <EmptyState
            title="Sin actividad registrada este mes."
            body="Cuando se programen hitos para este periodo, aparecerán aquí con su avance por tipo."
            ctaLabel=""
          />
        ) : (
          <div className="portal-card" style={{ borderRadius: '6px', padding: 'clamp(1.5rem, 3vw, 2rem)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {[...byType.entries()].map(([type, c]) => {
                const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.55rem' }}>
                      <span className="flex items-center gap-2.5">
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: EVENT_TYPE_COLORS[type], flexShrink: 0 }} />
                        <span style={{ fontFamily: PORTAL.mono, fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: PORTAL.cream }}>
                          {EVENT_TYPE_LABELS[type]}
                        </span>
                      </span>
                      <span style={{ fontFamily: PORTAL.mono, fontSize: '0.6rem', letterSpacing: '0.08em', color: PORTAL.muted, fontVariantNumeric: 'tabular-nums' }}>
                        {c.done} / {c.total}
                      </span>
                    </div>
                    <div style={{ height: '2px', background: 'rgba(237,232,224,0.1)', overflow: 'hidden', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: PORTAL.accent }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </PortalShell>
  )
}
