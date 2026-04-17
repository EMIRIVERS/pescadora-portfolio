'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X, Check } from 'lucide-react'
import { createExpense, deleteExpense } from '@/lib/actions/expenses'
import type { ProjectExpense } from '@/lib/supabase/types'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const CATEGORIES = [
  'Equipamiento',
  'Locacion',
  'Talent',
  'Transporte',
  'Post-produccion',
  'Licencias',
  'Otro',
]

function fmt(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  projectId: string
  budget: number | null | undefined
  currency: string | null | undefined
  initialExpenses: ProjectExpense[]
}

const INPUT: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-3)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 13,
  color: 'var(--dash-text-primary)',
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--dash-text-tertiary)',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'block',
}

export function BudgetTracker({ projectId, budget, currency, initialExpenses }: Props) {
  const cur = currency ?? 'MXN'
  const [expenses, setExpenses] = useState<ProjectExpense[]>(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[CATEGORIES.length - 1])
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const remaining = budget != null ? budget - totalSpent : null
  const pct = budget != null && budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : null

  const barColor =
    pct == null ? '#0071E3' : pct >= 100 ? '#FF453A' : pct >= 80 ? '#FF9F0A' : '#30D158'

  function resetForm() {
    setLabel(''); setAmount(''); setCategory(CATEGORIES[CATEGORIES.length - 1])
    setNotes(''); setDate(new Date().toISOString().slice(0, 10))
    setError(null); setShowForm(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!label.trim() || isNaN(parsed) || parsed <= 0) {
      setError('Ingresa un concepto y monto valido.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createExpense({
        projectId, label: label.trim(), amount: parsed,
        category: category || null, notes: notes.trim() || null, date: date || null,
      })
      if (result.error) { setError(result.error); return }
      if (result.data) setExpenses((prev) => [result.data as ProjectExpense, ...prev])
      resetForm()
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Eliminar este gasto?')) return
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    startTransition(async () => { await deleteExpense(id, projectId) })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--dash-text-primary)' }}>
          Presupuesto y gastos
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', background: 'var(--dash-surface-2)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              fontSize: 12, color: 'var(--dash-text-secondary)', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <Plus size={11} strokeWidth={2} /> Agregar gasto
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{
        backgroundColor: 'var(--dash-surface-2)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {budget != null && (
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)' }}>
                Presupuesto
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--dash-text-primary)' }}>
                {fmt(budget, cur)}
              </p>
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)' }}>
              Gastado
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: totalSpent > 0 ? '#FF9F0A' : 'var(--dash-text-tertiary)' }}>
              {fmt(totalSpent, cur)}
            </p>
          </div>
          {remaining != null && (
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)' }}>
                Disponible
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: remaining < 0 ? '#FF453A' : '#30D158' }}>
                {fmt(remaining, cur)}
              </p>
            </div>
          )}
        </div>

        {pct != null && (
          <div>
            <div style={{ height: 6, borderRadius: 99, backgroundColor: 'var(--dash-surface-3)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: 99,
                backgroundColor: barColor, transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)' }}>
              {pct.toFixed(1)}% del presupuesto utilizado
            </p>
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          backgroundColor: 'var(--dash-surface-2)', border: '1px solid rgba(0,113,227,0.35)',
          borderRadius: 16,
        }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={LABEL}>Concepto *</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Renta de camara" style={INPUT} /></div>
              <div><label style={LABEL}>Monto ({cur}) *</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={INPUT} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={LABEL}>Categoria</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label style={LABEL}>Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={INPUT} /></div>
            </div>
            <div><label style={LABEL}>Notas</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" style={INPUT} /></div>
            {error && <p style={{ margin: 0, fontSize: 12, color: '#FF453A' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button type="submit" disabled={isPending} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 16px', background: '#0071E3', border: 'none',
                borderRadius: 8, fontSize: 12, color: '#fff',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1, fontFamily: FONT,
              }}>
                <Check size={11} strokeWidth={2.5} />
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={resetForm} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', background: 'transparent', border: 'none',
                borderRadius: 8, fontSize: 12, color: 'var(--dash-text-tertiary)', cursor: 'pointer', fontFamily: FONT,
              }}>
                <X size={11} strokeWidth={2} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense list */}
      {expenses.length > 0 && (
        <div style={{
          backgroundColor: 'var(--dash-surface-2)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Concepto', 'Categoria', 'Fecha', 'Monto', ''].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: 'var(--dash-text-tertiary)', textAlign: h === 'Monto' ? 'right' : 'left', fontFamily: FONT,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, idx) => (
                <tr key={expense.id} style={{ borderBottom: idx < expenses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--dash-text-primary)', fontFamily: FONT }}>
                    {expense.label}
                    {expense.notes && <span style={{ display: 'block', fontSize: 11, color: 'var(--dash-text-tertiary)', marginTop: 2 }}>{expense.notes}</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{expense.category ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--dash-text-secondary)', fontFamily: FONT, whiteSpace: 'nowrap' }}>{fmtDate(expense.date)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#FF9F0A', fontFamily: FONT, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {fmt(expense.amount, cur)}
                  </td>
                  <td style={{ padding: '12px 12px 12px 4px', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(expense.id)} title="Eliminar gasto"
                      style={{ border: 'none', background: 'transparent', color: '#3A3A3C', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expenses.length === 0 && !showForm && (
        <p style={{ margin: 0, fontSize: 13, color: '#3A3A3C', fontFamily: FONT }}>Sin gastos registrados.</p>
      )}
    </section>
  )
}
