'use client'

/**
 * QuoteBuilder — constructor de cotizaciones de pocos clics.
 * Replica el flujo del builder de 1640 con el diseño Apple del panel de XICO.
 */

import { useMemo, useState } from 'react'
import { Send, X } from 'lucide-react'
import {
  CLIENT_TYPE_LABELS,
  type QuoteLine,
  type ClientType,
  type FiscalData,
} from '@/lib/billing/catalog'
import { calcTaxBreakdown } from '@/lib/billing/tax'
import { createProposal, updateProposal, type Proposal } from '@/lib/actions/proposals'
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

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clients: { id: string; name: string }[]
  editing?: Proposal | null
}

function defaultValidUntil(): string {
  return new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10)
}

export default function QuoteBuilder({ open, onClose, onSaved, clients, editing }: Props) {
  const isEditing = !!editing

  const [title, setTitle] = useState(editing?.title ?? '')
  const [clientId, setClientId] = useState(editing?.client_id ?? '')
  const [clientType, setClientType] = useState<ClientType>(editing?.client_type ?? 'DIRECTO')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>((editing?.currency as 'MXN' | 'USD') ?? 'MXN')
  const [validUntil, setValidUntil] = useState(editing?.valid_until ?? defaultValidUntil())
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

  async function save(sendAfter: boolean) {
    setError('')
    if (!title.trim()) return setError('El título es obligatorio.')
    if (lines.length === 0) return setError('Agrega al menos un servicio.')

    setSaving(true)
    const payload = {
      title: title.trim(),
      description: '',
      items: lines,
      client_type: clientType,
      applyRetenciones: retActive,
      currency,
      client_id: clientId || null,
      lead_id: null,
      valid_until: validUntil || null,
      fiscal_data: buildFiscalData(),
      notes,
      status: (sendAfter ? 'sent' : isEditing ? editing!.status : 'draft') as Proposal['status'],
    }
    const result = isEditing ? await updateProposal(editing!.id, payload) : await createProposal(payload)
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
            {isEditing ? 'Editar cotización' : 'Nueva cotización'}
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em' }}>
            Constructor de presupuesto
          </h2>
        </div>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Datos generales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL}>Título *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={INPUT} placeholder="Producción de spot — Marca X" autoFocus />
        </div>
        <div>
          <label style={LABEL}>Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ ...INPUT, appearance: 'none' }}>
            <option value="">Sin cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <label style={LABEL}>Válida hasta</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={INPUT} />
        </div>
        <div>
          <label style={LABEL}>Moneda</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'MXN' | 'USD')} style={{ ...INPUT, appearance: 'none' }}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <LineItemsEditor lines={lines} setLines={setLines} currency={currency} tax={tax} />

      {clientType === 'EMPRESA' && (
        <FiscalFields state={fiscal} set={setFiscalField} showRetToggle={currency === 'MXN'} applyRet={applyRet} setApplyRet={setApplyRet} />
      )}

      {/* Notas */}
      <div style={{ marginBottom: 18 }}>
        <label style={LABEL}>Notas internas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...INPUT, resize: 'vertical' }} placeholder="Observaciones, acuerdos previos..." />
      </div>

      {error && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--dash-danger)' }}>{error}</p>}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => save(false)} disabled={saving} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--dash-border-strong)', background: 'transparent', color: 'var(--dash-text-primary)', fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar borrador'}
        </button>
        <button type="button" onClick={() => save(true)} disabled={saving} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Send size={14} strokeWidth={2} /> Guardar y enviar
        </button>
      </div>
    </BuilderOverlay>
  )
}
