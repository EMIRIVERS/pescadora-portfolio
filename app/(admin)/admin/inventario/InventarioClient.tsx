'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Search, X, Loader2, LayoutGrid, List as ListIcon,
  Camera, ImagePlus, MapPin,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast, ConfirmModal } from '@/components/admin/ui'
import {
  createEquipment, updateEquipment, deleteEquipment, type EquipmentInput,
} from '@/lib/actions/equipment'
import type {
  ProductionEquipment, EquipmentCategory, EquipmentStatus, Json,
} from '@/lib/supabase/types'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export const EQUIPMENT_CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: 'camaras', label: 'Cámaras' },
  { value: 'lentes', label: 'Lentes / Ópticas' },
  { value: 'iluminacion', label: 'Iluminación' },
  { value: 'audio', label: 'Audio' },
  { value: 'soportes', label: 'Soportes y estabilización' },
  { value: 'energia', label: 'Energía y almacenamiento' },
  { value: 'drones', label: 'Drones / Aéreo' },
  { value: 'accesorios', label: 'Accesorios' },
  { value: 'otros', label: 'Otros' },
]

const STATUS_STYLES: Record<EquipmentStatus, { color: string; bg: string; label: string }> = {
  available:   { color: 'var(--dash-success)', bg: 'rgba(48,209,88,0.12)', label: 'Disponible' },
  in_use:      { color: 'var(--dash-info)', bg: 'rgba(100,210,255,0.12)', label: 'En uso' },
  maintenance: { color: 'var(--dash-warning)', bg: 'rgba(255,159,10,0.12)', label: 'Mantenimiento' },
  retired:     { color: 'var(--dash-text-tertiary)', bg: 'rgba(120,120,120,0.12)', label: 'Retirado' },
}

const CONDITIONS = ['Nuevo', 'Excelente', 'Bueno', 'Regular', 'Dañado']

function categoryLabel(value: string): string {
  return EQUIPMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

function fmt(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

interface SpecPair { k: string; v: string }

interface FormState {
  name: string
  brand: string
  model: string
  category: EquipmentCategory
  status: EquipmentStatus
  condition: string
  serialNumber: string
  quantity: number
  purchaseDate: string
  purchaseCost: string
  currency: string
  location: string
  imageUrl: string | null
  specs: SpecPair[]
  notes: string
}

function emptyForm(): FormState {
  return {
    name: '', brand: '', model: '', category: 'camaras', status: 'available',
    condition: 'Bueno', serialNumber: '', quantity: 1, purchaseDate: '', purchaseCost: '',
    currency: 'MXN', location: '', imageUrl: null, specs: [], notes: '',
  }
}

function specsToPairs(specs: Json): SpecPair[] {
  if (specs && typeof specs === 'object' && !Array.isArray(specs)) {
    return Object.entries(specs).map(([k, v]) => ({ k, v: String(v ?? '') }))
  }
  return []
}

function pairsToSpecs(pairs: SpecPair[]): Json {
  const out: Record<string, string> = {}
  for (const p of pairs) {
    if (p.k.trim()) out[p.k.trim()] = p.v
  }
  return out
}

interface Props {
  initialEquipment: ProductionEquipment[]
}

export default function InventarioClient({ initialEquipment }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const [view, setView] = useState<'gallery' | 'list'>('gallery')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<EquipmentCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductionEquipment | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Count per category for chip badges (respects search + status, not category)
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialEquipment.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (q) {
        const hay = `${e.name} ${e.brand ?? ''} ${e.model ?? ''} ${categoryLabel(e.category)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [initialEquipment, search, statusFilter])

  const filtered = useMemo(
    () => baseFiltered.filter((e) => catFilter === 'all' || e.category === catFilter),
    [baseFiltered, catFilter],
  )

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of baseFiltered) m[e.category] = (m[e.category] ?? 0) + 1
    return m
  }, [baseFiltered])

  function openNew() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(e: ProductionEquipment) {
    setEditingId(e.id)
    setForm({
      name: e.name,
      brand: e.brand ?? '',
      model: e.model ?? '',
      category: e.category,
      status: e.status,
      condition: e.condition ?? 'Bueno',
      serialNumber: e.serial_number ?? '',
      quantity: e.quantity ?? 1,
      purchaseDate: e.purchase_date ?? '',
      purchaseCost: e.purchase_cost != null ? String(e.purchase_cost) : '',
      currency: e.currency ?? 'MXN',
      location: e.location ?? '',
      imageUrl: e.image_url,
      specs: specsToPairs(e.specs),
      notes: e.notes ?? '',
    })
    setModalOpen(true)
  }

  async function handleImageUpload(file: File) {
    const MAX = 15 * 1024 * 1024
    if (file.size > MAX) {
      toast.error('La imagen excede el límite de 15 MB.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `equipment/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
      if (error) {
        toast.error(`Error al subir: ${error.message}`)
        return
      }
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setForm((f) => ({ ...f, imageUrl: data.publicUrl }))
      toast.success('Foto subida.')
    } finally {
      setUploading(false)
    }
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error('Escribe el nombre del equipo.')
      return
    }
    const payload: EquipmentInput = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      category: form.category,
      status: form.status,
      condition: form.condition || null,
      serialNumber: form.serialNumber.trim() || null,
      quantity: Math.max(0, Math.round(form.quantity) || 0),
      purchaseDate: form.purchaseDate || null,
      purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
      currency: form.currency,
      location: form.location.trim() || null,
      imageUrl: form.imageUrl,
      specs: pairsToSpecs(form.specs),
      notes: form.notes.trim() || null,
    }
    startTransition(async () => {
      const res = editingId ? await updateEquipment(editingId, payload) : await createEquipment(payload)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(editingId ? 'Equipo actualizado.' : 'Equipo agregado.')
      setModalOpen(false)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    startTransition(async () => {
      const res = await deleteEquipment(target.id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Equipo eliminado.')
      setDeleteTarget(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-tertiary)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo, marca o modelo..." style={{ ...inputStyle, paddingLeft: 30, width: '100%' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | 'all')} style={inputStyle}>
          <option value="all">Todos los estados</option>
          {(Object.keys(STATUS_STYLES) as EquipmentStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
          ))}
        </select>
        <div style={{ display: 'flex', border: '1px solid var(--dash-border)', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setView('gallery')} title="Galería" style={toggleBtn(view === 'gallery')}><LayoutGrid size={15} /></button>
          <button onClick={() => setView('list')} title="Lista" style={toggleBtn(view === 'list')}><ListIcon size={15} /></button>
        </div>
        <button onClick={openNew} style={primaryBtn}><Plus size={15} strokeWidth={2} /> Agregar equipo</button>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <Chip active={catFilter === 'all'} onClick={() => setCatFilter('all')} label="Todo" count={baseFiltered.length} />
        {EQUIPMENT_CATEGORIES.map((c) => (
          <Chip key={c.value} active={catFilter === c.value} onClick={() => setCatFilter(c.value)} label={c.label} count={catCounts[c.value] ?? 0} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--dash-text-tertiary)', border: '1px dashed var(--dash-border)', borderRadius: 12 }}>
          <Camera size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No hay equipo que coincida. Agrega tu primer equipo con el botón de arriba.</p>
        </div>
      ) : view === 'gallery' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map((e) => {
            const st = STATUS_STYLES[e.status]
            return (
              <div key={e.id} style={{ border: '1px solid var(--dash-border)', borderRadius: 14, overflow: 'hidden', background: 'var(--dash-surface-1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: 'var(--dash-surface-2)' }}>
                  {e.image_url ? (
                    <Image src={e.image_url} alt={e.name} fill sizes="240px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-tertiary)' }}>
                      <Camera size={32} strokeWidth={1.2} />
                    </div>
                  )}
                  <span style={{ position: 'absolute', top: 8, left: 8, ...pillBadge, color: st.color, background: st.bg, backdropFilter: 'blur(8px)' }}>{st.label}</span>
                  {e.quantity > 1 && (
                    <span style={{ position: 'absolute', top: 8, right: 8, ...pillBadge, color: '#fff', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>×{e.quantity}</span>
                  )}
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--dash-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{categoryLabel(e.category)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)', lineHeight: 1.3 }}>{e.name}</span>
                  {(e.brand || e.model) && (
                    <span style={{ fontSize: 12, color: 'var(--dash-text-secondary)' }}>{[e.brand, e.model].filter(Boolean).join(' · ')}</span>
                  )}
                  {e.location && (
                    <span style={{ fontSize: 11, color: 'var(--dash-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> {e.location}</span>
                  )}
                  <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 8 }}>
                    <button onClick={() => openEdit(e)} style={{ ...ghostBtn, flex: 1, justifyContent: 'center', padding: '6px 0' }}><Pencil size={13} /> Editar</button>
                    <button onClick={() => setDeleteTarget(e)} title="Eliminar" style={{ ...iconBtn, color: 'var(--dash-danger)', border: '1px solid var(--dash-border)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--dash-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--dash-surface-1)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
              <thead>
                <tr style={{ background: 'var(--dash-surface-2)' }}>
                  {['', 'Equipo', 'Categoría', 'Estado', 'Cond.', 'Cant.', 'Ubicación', 'Costo', ''].map((h, i) => (
                    <th key={i} style={{ ...thStyle, textAlign: h === 'Costo' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const st = STATUS_STYLES[e.status]
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--dash-border)' }}>
                      <td style={{ ...tdStyle, width: 48 }}>
                        <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--dash-surface-2)', flexShrink: 0 }}>
                          {e.image_url ? (
                            <Image src={e.image_url} alt={e.name} fill sizes="40px" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-tertiary)' }}><Camera size={16} /></div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--dash-text-primary)', fontWeight: 500 }}>
                        {e.name}
                        {(e.brand || e.model) && <div style={{ fontSize: 12, color: 'var(--dash-text-tertiary)', fontWeight: 400 }}>{[e.brand, e.model].filter(Boolean).join(' · ')}</div>}
                      </td>
                      <td style={tdStyle}><span style={pill}>{categoryLabel(e.category)}</span></td>
                      <td style={tdStyle}><span style={{ ...pill, color: st.color, background: st.bg }}>{st.label}</span></td>
                      <td style={tdStyle}>{e.condition ?? '—'}</td>
                      <td style={tdStyle}>{e.quantity}</td>
                      <td style={tdStyle}>{e.location ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{e.purchase_cost != null ? fmt(Number(e.purchase_cost), e.currency) : '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(e)} title="Editar" style={iconBtn}><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(e)} title="Eliminar" style={{ ...iconBtn, color: 'var(--dash-danger)' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={overlay} onClick={() => !isPending && setModalOpen(false)}>
          <div style={modalBox} onClick={(ev) => ev.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{editingId ? 'Editar equipo' : 'Agregar equipo'}</h2>
              <button onClick={() => setModalOpen(false)} style={iconBtn}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Image */}
              <div style={{ flex: '0 0 160px' }}>
                <div style={{ position: 'relative', width: 160, height: 120, borderRadius: 12, overflow: 'hidden', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)' }}>
                  {form.imageUrl ? (
                    <Image src={form.imageUrl} alt="" fill sizes="160px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-tertiary)' }}><Camera size={28} strokeWidth={1.2} /></div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); e.target.value = '' }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...ghostBtn, width: 160, justifyContent: 'center', marginTop: 8 }}>
                  {uploading ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />} {form.imageUrl ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {form.imageUrl && (
                  <button onClick={() => setForm({ ...form, imageUrl: null })} style={{ ...ghostBtn, width: 160, justifyContent: 'center', marginTop: 6 }}><X size={13} /> Quitar foto</button>
                )}
              </div>

              {/* Fields */}
              <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260 }}>
                <Field label="Nombre *">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. DJI Osmo Pocket 4" style={inputStyle} />
                </Field>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Field label="Marca" flex><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="DJI, Sony, Aputure..." style={inputStyle} /></Field>
                  <Field label="Modelo" flex><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={inputStyle} /></Field>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Field label="Categoría" flex>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EquipmentCategory })} style={inputStyle}>
                      {EQUIPMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado" flex>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EquipmentStatus })} style={inputStyle}>
                      {(Object.keys(STATUS_STYLES) as EquipmentStatus[]).map((s) => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <Field label="Condición" flex>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} style={inputStyle}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Cantidad" flex><input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="No. de serie" flex><input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} style={inputStyle} /></Field>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <Field label="Fecha de compra" flex><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} style={inputStyle} /></Field>
              <Field label="Costo" flex><input type="number" min={0} step="0.01" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} style={inputStyle} /></Field>
              <Field label="Moneda" flex>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                  <option value="MXN">MXN</option><option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Ubicación" flex><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bodega, mochila..." style={inputStyle} /></Field>
            </div>

            {/* Specs editor */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Especificaciones</span>
                <button onClick={() => setForm({ ...form, specs: [...form.specs, { k: '', v: '' }] })} style={{ ...ghostBtn, padding: '4px 10px', fontSize: 12 }}><Plus size={13} /> Añadir</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.specs.length === 0 && <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)' }}>Sin especificaciones. Ej. Sensor, Resolución, Montura, Potencia...</span>}
                {form.specs.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input value={p.k} onChange={(e) => { const s = [...form.specs]; s[i] = { ...s[i], k: e.target.value }; setForm({ ...form, specs: s }) }} placeholder="Característica" style={{ ...inputStyle, flex: '0 0 38%' }} />
                    <input value={p.v} onChange={(e) => { const s = [...form.specs]; s[i] = { ...s[i], v: e.target.value }; setForm({ ...form, specs: s }) }} placeholder="Valor" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => setForm({ ...form, specs: form.specs.filter((_, j) => j !== i) })} style={iconBtn}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Notas">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', marginTop: 12 }} />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setModalOpen(false)} disabled={isPending} style={ghostBtn}>Cancelar</button>
              <button onClick={handleSave} disabled={isPending || uploading} style={primaryBtn}>
                {isPending ? <Loader2 size={15} className="spin" /> : null} {editingId ? 'Guardar cambios' : 'Agregar equipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Eliminar equipo"
        description={deleteTarget ? `¿Eliminar "${deleteTarget.name}" del inventario? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <style>{`.spin { animation: spin 0.8s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
        border: `1px solid ${active ? 'var(--dash-accent)' : 'var(--dash-border)'}`,
        background: active ? 'color-mix(in srgb, var(--dash-accent) 14%, transparent)' : 'transparent',
        color: active ? 'var(--dash-accent)' : 'var(--dash-text-secondary)',
      }}
    >
      {label}
      <span style={{ fontSize: 11, opacity: 0.8, background: active ? 'transparent' : 'var(--dash-surface-3)', padding: '0 6px', borderRadius: 10 }}>{count}</span>
    </button>
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
  background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: 8,
  padding: '8px 10px', fontSize: 13, color: 'var(--dash-text-primary)', fontFamily: FONT, outline: 'none',
}
const thStyle: React.CSSProperties = {
  padding: '11px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: 'var(--dash-text-secondary)', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { padding: '11px 14px', fontSize: 13, color: 'var(--dash-text-secondary)', fontFamily: FONT }
const pill: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12, background: 'var(--dash-surface-3)', color: 'var(--dash-text-secondary)' }
const pillBadge: React.CSSProperties = { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: FONT }
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--dash-accent)', color: '#fff',
  border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: FONT,
}
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--dash-text-secondary)',
  border: '1px solid var(--dash-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: FONT,
}
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--dash-text-secondary)', cursor: 'pointer',
  padding: 6, borderRadius: 6, display: 'inline-flex', alignItems: 'center',
}
function toggleBtn(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px',
    background: active ? 'var(--dash-surface-3)' : 'transparent', border: 'none',
    color: active ? 'var(--dash-text-primary)' : 'var(--dash-text-tertiary)', cursor: 'pointer',
  }
}
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto',
}
const modalBox: React.CSSProperties = {
  background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 16,
  padding: 24, width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
}
