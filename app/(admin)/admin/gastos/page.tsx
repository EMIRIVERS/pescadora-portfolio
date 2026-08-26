import { createServiceClient } from '@/lib/supabase/server'
import type { BusinessExpense } from '@/lib/supabase/types'
import GastosClient from './GastosClient'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export default async function GastosPage() {
  const db = createServiceClient()

  const [{ data: expensesRaw }, { data: projects }] = await Promise.all([
    db.from('business_expenses').select('*').order('date', { ascending: false }),
    db.from('projects').select('id, title').order('title'),
  ])

  const expenses = (expensesRaw ?? []) as BusinessExpense[]

  const now = new Date()
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date + 'T00:00:00')
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, e) => s + Number(e.amount), 0)
  const thisYear = expenses
    .filter((e) => new Date(e.date + 'T00:00:00').getFullYear() === now.getFullYear())
    .reduce((s, e) => s + Number(e.amount), 0)
  const pending = expenses
    .filter((e) => e.status === 'pending')
    .reduce((s, e) => s + Number(e.amount), 0)
  const pendingCount = expenses.filter((e) => e.status === 'pending').length

  function fmt(n: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
  }

  const stats: { label: string; value: string; sub?: string; color: string }[] = [
    { label: 'Este mes', value: fmt(thisMonth), color: 'var(--dash-accent)' },
    { label: 'Este año', value: fmt(thisYear), color: 'var(--dash-text-secondary)' },
    {
      label: 'Pendiente',
      value: fmt(pending),
      sub: `${pendingCount} gasto${pendingCount !== 1 ? 's' : ''} por pagar`,
      color: 'var(--dash-warning)',
    },
    { label: 'Total gastos', value: expenses.length.toString(), color: 'var(--dash-text-secondary)' },
  ]

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>
          Gastos
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--dash-text-secondary)' }}>
          Gastos generales del negocio: renta, suscripciones, equipo, viáticos y más
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: '1 1 140px',
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderTop: `2px solid ${s.color}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{s.label}</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em', fontFamily: FONT }}>{s.value}</p>
            {s.sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: s.color, fontFamily: FONT }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      <GastosClient
        initialExpenses={expenses}
        projects={(projects ?? []) as { id: string; title: string }[]}
      />
    </div>
  )
}
