'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, Paperclip, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast, ConfirmModal } from '@/components/admin/ui'
import {
  createBusinessExpense,
  updateBusinessExpense,
  deleteBusinessExpense,
  type BusinessExpenseInput,
} from '@/lib/actions/business-expenses'
import type { BusinessExpense, BusinessExpenseStatus } from '@/lib/supabase/types'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'renta', label: 'Renta' },
  { value: 'suscripciones', label: 'Suscripciones' },
  { value: 'software', label: 'Software' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otro', label: 'Otro' },
]

const STATUS_STYLES: Record<BusinessExpenseStatus, { color: string; bg: string; label: string }> = {
  paid: { color: 'var(--dash-success)', bg: 'rgba(48,209,88,0.12)', label: 'Pagado' },
  pending: { color: 'var(--dash-warning)', bg: 'rgba(255,159,10,0.12)', label: 'Pendiente' },
}

function categoryLabel(value: string | null): string {
  if (!value) return '—'
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

function fmt(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  initialExpenses: BusinessExpense[]
  projects: { id: string; title: string }[]
}

const todayISO = () => new Date().toISOString().slice(0, 10)

function emptyForm(): BusinessExpenseInput {
  return {
    label: '',
    amount: 0,
    currency: 'MXN',
    category: 'otros',
    vendor: null,
    paymentMethod: 'transferencia',
    status: 'paid',
    date: todayISO(),
    projectId: null,
    receiptUrl: null,
    notes: null,
  }
}

export default function GastosClient({ initialExpenses, projects }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | BusinessExpenseStatus>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BusinessExpenseInput>(emptyForm())
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BusinessExpense | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialExpenses.filter((e) => {
      if (catFilter !== 'all' && e.category !== catFilter) return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (q) {
        const hay = `${e.label} ${e.vendor ?? ''} ${categoryLabel(e.category)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [initialExpenses, search, catFilter, statusFilter])

  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0)

  function openNew() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(e: BusinessExpense) {
    setEditingId(e.id)
    setForm({
      label: e.label,
      amount: Number(e.amount),
      currency: e.currency,
      category: e.category,
      vendor: e.vendor,
      paymentMethod: e.payment_method,
      status: e.status,
      date: e.date,
      projectId: e.project_id,
      receiptUrl: e.receipt_url,
      notes: e.notes,
    })
    setModalOpen(true)
  }

  async function handleReceiptUpload(file: File) {
    const MAX = 20 * 1024 * 1024
    if (file.size > MAX) {
      toast.error('El archivo excede el límite de 20 MB.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `expenses/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
      if (error) {
        toast.error(`Error al subir: ${error.message}`)
        return
      }
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setForm((f) => ({ ...f, receiptUrl: data.publicUrl }))
      toast.success('Recibo adjuntado.')
    } finally {
      setUploading(false)
    }
  }

  function handleSave() {
    if (!form.label.trim()) {
      toast.error('Escribe un concepto para el gasto.')
      return
    }
    if (!(form.amount > 0)) {
      toast.error('El monto debe ser mayor a cero.')
      return
    }
    startTransition(async () => {
      const payload: BusinessExpenseInput = {
        ...form,
        label: form.label.trim(),
        vendor: form.vendor?.trim() || null,
        notes: form.notes?.trim() || null,
      }
      const res = editingId
        ? await updateBusinessExpense(editingId, payload)
        : await createBusinessExpense(payload)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(editingId ? 'Gasto actualizado.' : 'Gasto registrado.')
      setModalOpen(false)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    startTransition(async () => {
      const res = await deleteBusinessExpense(target.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Gasto eliminado.')
      setDeleteTarget(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar concepto o proveedor..."
            style={{ ...inputStyle, paddingLeft: 30, width: '100%' }}
          />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={inputStyle}>
          <option value="all">Todas las categorías</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | BusinessExpenseStatus)} style={inputStyle}>
          <option value="all">Todos los estados</option>
          <option value="paid">Pagado</option>
          <option value="pending">Pendiente</option>
        </select>
        <button onClick={openNew} style={primaryBtn}>
          <Plus size={15} strokeWidth={2} /> Nuevo gasto
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--dash-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--dash-surface-1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
            <thead>
              <tr style={{ background: 'var(--dash-surface-2)' }}>
                {['Fecha', 'Concepto', 'Categoría', 'Proveedor', 'Método', 'Estado', 'Monto', ''].map((h, i) => (
                  <th key={i} style={{ ...thStyle, textAlign: h === 'Monto' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--dash-text-tertiary)', fontSize: 14 }}>
                    No hay gastos que coincidan.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const st = STATUS_STYLES[e.status]
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--dash-border)' }}>
                      <td style={tdStyle}>{fmtDate(e.date)}</td>
                      <td style={{ ...tdStyle, color: 'var(--dash-text-primary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {e.label}
                          {e.receipt_url && (
                            <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" title="Ver recibo" style={{ color: 'var(--dash-text-tertiary)', display: 'inline-flex' }}>
                              <Paperclip size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={pill}>{categoryLabel(e.category)}</span>
                      </td>
                      <td style={tdStyle}>{e.vendor ?? '—'}</td>
                      <td style={tdStyle}>{PAYMENT_METHODS.find((p) => p.value === e.payment_method)?.label ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ ...pill, color: st.color, background: st.bg }}>{st.label}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--dash-text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmt(Number(e.amount), e.currency)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(e)} title="Editar" style={iconBtn}><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(e)} title="Eliminar" style={{ ...iconBtn, color: 'var(--dash-danger)' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--dash-border-strong)', background: 'var(--dash-surface-2)' }}>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'right', color: 'var(--dash-text-secondary)', fontWeight: 500 }}>
                    Total ({filtered.length})
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--dash-text-primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(filteredTotal)}</td>
                  <td style={tdStyle} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={overlay} onClick={() => !isPending && setModalOpen(false)}>
          <div style={modalBox} onClick={(ev) => ev.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--dash-text-primary)' }}>
                {editingId ? 'Editar gasto' : 'Nuevo gasto'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={iconBtn}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Concepto *">
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ej. Renta de oficina junio" style={inputStyle} />
              </Field>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Field label="Monto *" flex>
                  <input type="number" min={0} step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                </Field>
                <Field label="Moneda" flex>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
                <Field label="Fecha" flex>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </Field>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Field label="Categoría" flex>
                  <select value={form.category ?? 'otros'} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Método de pago" flex>
                  <select value={form.paymentMethod ?? 'transferencia'} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={inputStyle}>
                    {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Estado" flex>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BusinessExpenseStatus })} style={inputStyle}>
                    <option value="paid">Pagado</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Field label="Proveedor" flex>
                  <input value={form.vendor ?? ''} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Comercio / proveedor" style={inputStyle} />
                </Field>
                <Field label="Proyecto (opcional)" flex>
                  <select value={form.projectId ?? ''} onChange={(e) => setForm({ ...form, projectId: e.target.value || null })} style={inputStyle}>
                    <option value="">Sin proyecto</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Notas">
                <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>

              <Field label="Recibo / factura">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleReceiptUpload(f); e.target.value = '' }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={ghostBtn}>
                    {uploading ? <Loader2 size={14} className="spin" /> : <Paperclip size={14} />} {form.receiptUrl ? 'Reemplazar' : 'Adjuntar'}
                  </button>
                  {form.receiptUrl && (
                    <>
                      <a href={form.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--dash-accent)' }}>Ver recibo</a>
                      <button onClick={() => setForm({ ...form, receiptUrl: null })} style={iconBtn}><X size={14} /></button>
                    </>
                  )}
                </div>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalOpen(false)} disabled={isPending} style={ghostBtn}>Cancelar</button>
              <button onClick={handleSave} disabled={isPending || uploading} style={primaryBtn}>
                {isPending ? <Loader2 size={15} className="spin" /> : null} {editingId ? 'Guardar cambios' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Eliminar gasto"
        description={deleteTarget ? `¿Eliminar "${deleteTarget.label}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <style>{`.spin { animation: spin 0.8s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: flex ? '1 1 140px' : undefined, minWidth: flex ? 120 : undefined }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--dash-surface-2)',
  border: '1px solid var(--dash-border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--dash-text-primary)',
  fontFamily: FONT,
  outline: 'none',
}

const thStyle: React.CSSProperties = {
  padding: '11px 14px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-secondary)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  fontSize: 13,
  color: 'var(--dash-text-secondary)',
  fontFamily: FONT,
}

const pill: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 12,
  background: 'var(--dash-surface-3)',
  color: 'var(--dash-text-secondary)',
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--dash-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: FONT,
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'transparent',
  color: 'var(--dash-text-secondary)',
  border: '1px solid var(--dash-border)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: FONT,
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--dash-text-secondary)',
  cursor: 'pointer',
  padding: 6,
  borderRadius: 6,
  display: 'inline-flex',
  alignItems: 'center',
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '6vh 16px',
  overflowY: 'auto',
}

const modalBox: React.CSSProperties = {
  background: 'var(--dash-surface-1)',
  border: '1px solid var(--dash-border)',
  borderRadius: 16,
  padding: 24,
  width: '100%',
  maxWidth: 560,
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
}
