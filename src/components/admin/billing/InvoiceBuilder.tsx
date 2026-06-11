'use client'

/**
 * InvoiceBuilder — constructor de facturas de pocos clics.
 * Mismo flujo que QuoteBuilder (catálogo → líneas → CFDI en vivo) pero con
 * los campos propios de una factura: folio, emisión, vencimiento, proyecto.
 */

import { useMemo, useState } from 'react'
import { Save, X } from 'lucide-react'
import {
  CLIENT_TYPE_LABELS,
  type QuoteLine,
  type ClientType,
  type FiscalData,
} from '@/lib/billing/catalog'
import { calcTaxBreakdown } from '@/lib/billing/tax'
import {
  createInvoice,
  updateInvoice,
  type InvoiceInput,
  type InvoiceStatus,
} from '@/lib/actions/invoices'
import {
  FONT,
  BLUE,
  INPUT,
  LABEL,
  LineItemsEditor,
  FiscalFields,
  BuilderOverlay,
  type FiscalFieldsState,
} from './billing-ui'

export interface EditingInvoice {
  id: string
  invoice_number: string
  title: string | null
  items: QuoteLine[] | null
  client_type: ClientType | null
  currency: string
  status: InvoiceStatus
  client_id: string | null
  project_id: string | null
  issue_date: string | null
  due_date: string | null
  fiscal_data: FiscalData | null
  notes: string | null
  tax: { retIsr?: number } | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clients: { id: string; name: string }[]
  projects: { id: string; title: string }[]
  editing?: EditingInvoice | null
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'paid', label: 'Pagada' },
  { value: 'overdue', label: 'Vencida' },
  { value: 'cancelled', label: 'Cancelada' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function plus30(): string {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
}
function suggestNumber(): string {
  const y = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `FAC-${y}-${rand}`
}

export default function InvoiceBuilder({ open, onClose, onSaved, clients, projects, editing }: Props) {
  const isEditing = !!editing

  const [invoiceNumber, setInvoiceNumber] = useState(editing?.invoice_number ?? suggestNumber())
  const [title, setTitle] = useState(editing?.title ?? '')
  const [clientId, setClientId] = useState(editing?.client_id ?? '')
  const [projectId, setProjectId] = useState(editing?.project_id ?? '')
  const [clientType, setClientType] = useState<ClientType>(editing?.client_type ?? 'DIRECTO')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>((editing?.currency as 'MXN' | 'USD') ?? 'MXN')
  const [status, setStatus] = useState<InvoiceStatus>(editing?.status ?? 'draft')
  const [issueDate, setIssueDate] = useState(editing?.issue_date ?? today())
  const [dueDate, setDueDate] = useState(editing?.due_date ?? plus30())
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [lines, setLines] = useState<QuoteLine[]>(editing?.items ?? [])
  const [applyRet, setApplyRet] = useState<boolean>(!!editing?.tax?.retIsr)

  const fd = editing?.fiscal_data
  const [fiscal, setFiscal] = useState<FiscalFieldsState>({
    rfc: fd?.rfc ?? '',
    razonSocial: fd?.razonSocial ?? '',
    usoCfdi: fd?.usoCfdi ?? '',
    regimen: fd?.regimenFiscal ?? '',
    cp: fd?.codigoPostal ?? '',
    emailFisc: fd?.emailFacturacion ?? '',
  })
  function setFiscalField<K extends keyof FiscalFieldsState>(key: K, value: string) {
    setFiscal((prev) => ({ ...prev, [key]: value }))
  }

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const retActive = applyRet && currency === 'MXN' && clientType === 'EMPRESA'

  const tax = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    return calcTaxBreakdown(subtotal, retActive ? { applyRetIsr: true, applyRetIva: true } : {})
  }, [lines, retActive])

  function buildFiscalData(): FiscalData | null {
    if (clientType !== 'EMPRESA' || !fiscal.rfc.trim()) return null
    return {
      rfc: fiscal.rfc.trim(),
      razonSocial: fiscal.razonSocial.trim(),
      usoCfdi: fiscal.usoCfdi.trim(),
      regimenFiscal: fiscal.regimen.trim() || undefined,
      codigoPostal: fiscal.cp.trim() || undefined,
      emailFacturacion: fiscal.emailFisc.trim(),
    }
  }

  async function save() {
    setError('')
    if (!invoiceNumber.trim()) return setError('El número de factura es obligatorio.')
    if (lines.length === 0) return setError('Agrega al menos un servicio.')

    setSaving(true)
    const payload: InvoiceInput = {
      invoice_number: invoiceNumber.trim(),
      title: title.trim(),
      items: lines,
      client_type: clientType,
      applyRetenciones: retActive,
      currency,
      status,
      client_id: clientId || null,
      project_id: projectId || null,
      issue_date: issueDate || null,
      due_date: dueDate || null,
      fiscal_data: buildFiscalData(),
      notes,
    }
    const result = isEditing ? await updateInvoice(editing!.id, payload) : await createInvoice(payload)
    setSaving(false)

    if (result.error) return setError(result.error)
    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <BuilderOverlay onClose={onClose}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)' }}>
            {isEditing ? 'Editar factura' : 'Nueva factura'}
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em' }}>
            Constructor de factura
          </h2>
        </div>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Datos generales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        <div>
          <label style={LABEL}>N.º de factura *</label>
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} style={INPUT} placeholder="FAC-2026-0001" autoFocus />
        </div>
        <div>
          <label style={LABEL}>Concepto / título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={INPUT} placeholder="Producción de spot — Marca X" />
        </div>
        <div>
          <label style={LABEL}>Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
            <option value="">Sin cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL}>Proyecto</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL}>Tipo de cliente</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['DIRECTO', 'EMPRESA'] as ClientType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setClientType(t)}
                style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${clientType === t ? BLUE : 'var(--dash-border)'}`, background: clientType === t ? 'rgba(0,113,227,0.12)' : 'transparent', color: clientType === t ? BLUE : 'var(--dash-text-secondary)', fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}
              >
                {CLIENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={LABEL}>Moneda</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'MXN' | 'USD')} style={{ ...INPUT, appearance: 'none' }}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Fecha de emisión</label>
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={INPUT} />
        </div>
        <div>
          <label style={LABEL}>Fecha de vencimiento</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={INPUT} />
        </div>
        <div>
          <label style={LABEL}>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} style={{ ...INPUT, appearance: 'none' }}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <LineItemsEditor lines={lines} setLines={setLines} currency={currency} tax={tax} />

      {clientType === 'EMPRESA' && (
        <FiscalFields state={fiscal} set={setFiscalField} showRetToggle={currency === 'MXN'} applyRet={applyRet} setApplyRet={setApplyRet} />
      )}

      {/* Notas */}
      <div style={{ marginBottom: 18 }}>
        <label style={LABEL}>Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...INPUT, resize: 'vertical' }} placeholder="Notas internas, condiciones de pago..." />
      </div>

      {error && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--dash-danger)' }}>{error}</p>}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onClose} disabled={saving} style={{ padding: '11px 20px', borderRadius: 8, border: '1px solid var(--dash-border-strong)', background: 'transparent', color: 'var(--dash-text-primary)', fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
          Cancelar
        </button>
        <button type="button" onClick={save} disabled={saving} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Save size={14} strokeWidth={2} /> {isEditing ? 'Guardar cambios' : 'Crear factura'}
        </button>
      </div>
    </BuilderOverlay>
  )
}
