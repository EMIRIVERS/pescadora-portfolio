import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type CalendarEventType } from '@/lib/calendar/types'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

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

  const card: React.CSSProperties = {
    backgroundColor: 'var(--portal-surface)',
    border: '1px solid var(--portal-border)',
    borderRadius: 16,
    padding: '20px 22px',
  }
  const navLink: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--portal-text-muted)',
    textDecoration: 'none',
    padding: '6px 12px',
    border: '1px solid var(--portal-border)',
    borderRadius: 8,
  }

  return (
    <main style={{ fontFamily: FONT, minHeight: '100vh', backgroundColor: 'var(--portal-bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)' }}>
        <Link href={portalLink('/portal', ctx)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--portal-text-muted)', textDecoration: 'none', marginBottom: '2rem' }}>
          <span>&larr;</span>
          <span>Inicio</span>
        </Link>

        <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--portal-text)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Rendimiento
        </h1>
        <p style={{ fontSize: 14, color: 'var(--portal-text-muted)', margin: '0 0 1.5rem' }}>
          Resumen de tu mes con XICO Films.
        </p>

        {/* Selector de mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <Link href={`/portal/rendimiento?m=${monthParam(prev.y, prev.m)}`} style={navLink}>&larr; Anterior</Link>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--portal-text)' }}>{MONTHS[month]} {year}</span>
          <Link href={`/portal/rendimiento?m=${monthParam(next.y, next.m)}`} style={navLink}>Siguiente &rarr;</Link>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          <div style={card}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--portal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cobrado este mes</p>
            <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, color: '#30D158', letterSpacing: '-0.02em' }}>{money(cobrado, currency)}</p>
          </div>
          <div style={card}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--portal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Por cobrar (total)</p>
            <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, color: '#FF9F0A', letterSpacing: '-0.02em' }}>{money(porCobrar, currency)}</p>
          </div>
          <div style={card}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--portal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hitos cumplidos</p>
            <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, color: 'var(--portal-text)', letterSpacing: '-0.02em' }}>
              {hitosHechos}<span style={{ fontSize: 16, color: 'var(--portal-text-muted)' }}> / {hitosTotal}</span>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--portal-text-muted)' }}>{cumplimiento}% de cumplimiento</p>
          </div>
        </div>

        {/* Desglose de hitos por tipo */}
        <div style={card}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: 'var(--portal-text)' }}>Actividad del mes</p>
          {monthEvents.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--portal-text-muted)' }}>Sin actividad registrada este mes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...byType.entries()].map(([type, c]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: EVENT_TYPE_COLORS[type], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--portal-text)' }}>{EVENT_TYPE_LABELS[type]}</span>
                  <span style={{ fontSize: 13, color: 'var(--portal-text-muted)' }}>{c.done} / {c.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
