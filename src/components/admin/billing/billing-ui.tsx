'use client'

/**
 * Piezas de UI compartidas entre QuoteBuilder (cotizaciones) e InvoiceBuilder
 * (facturas): estilos, editor de líneas con catálogo + sugerencias + desglose
 * CFDI, y campos fiscales B2B. Mantiene ambos builders DRY.
 */

import { Plus, Trash2, Lightbulb, Minus } from 'lucide-react'
import {
  SERVICE_CATALOG,
  GROUP_ORDER,
  GROUP_LABELS,
  UNIT_LABELS,
  getSuggestions,
  findEntry,
  lineFromCatalog,
  type QuoteLine,
  type ServiceCategory,
} from '@/lib/billing/catalog'
import { formatMoney } from '@/lib/billing/format'
import type { TaxBreakdown } from '@/lib/billing/tax'

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
export const BLUE = '#0071E3'
export const AMBER = '#FF9F0A'

export const INPUT: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-3)',
  border: '1px solid var(--dash-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--dash-text-primary)',
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
}

export const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--dash-text-secondary)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  marginBottom: 6,
  fontFamily: FONT,
}

export const SECTION: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-tertiary)',
  fontFamily: FONT,
  marginBottom: 12,
}

const stepBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid var(--dash-border)',
  background: 'var(--dash-surface-3)',
  color: 'var(--dash-text-secondary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function SummaryRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, color: danger ? 'var(--dash-danger)' : 'var(--dash-text-secondary)' }}>{value}</span>
    </div>
  )
}

// ── Editor de líneas: catálogo + sugerencias + desglose CFDI ─────────────────

interface LineItemsEditorProps {
  lines: QuoteLine[]
  setLines: React.Dispatch<React.SetStateAction<QuoteLine[]>>
  currency: string
  tax: TaxBreakdown
}

export function LineItemsEditor({ lines, setLines, currency, tax }: LineItemsEditorProps) {
  const { suggestions } = getSuggestions(lines)

  function addCategory(category: ServiceCategory) {
    const entry = findEntry(category)
    if (!entry) return
    if (lines.find((l) => l.category === category)) return
    setLines((prev) => [...prev, lineFromCatalog(entry)])
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }
  function setQty(id: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, qty) } : l)))
  }
  function setPrice(id: string, unitPrice: number) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, unitPrice: Math.max(0, unitPrice) } : l)))
  }

  return (
    <>
      {/* Catálogo */}
      <p style={SECTION}>Servicios · clic para agregar</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
        {GROUP_ORDER.map((group) => {
          const entries = SERVICE_CATALOG.filter((e) => e.group === group)
          return (
            <div key={group}>
              <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)', opacity: 0.7 }}>
                {GROUP_LABELS[group]}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {entries.map((entry) => {
                  const active = !!lines.find((l) => l.category === entry.category)
                  const suggested = suggestions.includes(entry.category)
                  return (
                    <button
                      key={entry.category}
                      type="button"
                      onClick={() => addCategory(entry.category)}
                      disabled={active}
                      title={entry.description}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 11px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: FONT,
                        cursor: active ? 'default' : 'pointer',
                        border: active ? `1px solid ${BLUE}` : suggested ? `1px solid ${AMBER}` : '1px solid var(--dash-border)',
                        background: active ? 'rgba(0,113,227,0.16)' : suggested ? 'rgba(255,159,10,0.10)' : 'var(--dash-surface-3)',
                        color: active ? BLUE : suggested ? AMBER : 'var(--dash-text-secondary)',
                      }}
                    >
                      {active ? <span style={{ fontSize: 11 }}>✓</span> : <Plus size={12} strokeWidth={2} />}
                      {entry.label}
                      {suggested && !active && <Lightbulb size={11} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, border: `1px solid ${AMBER}33`, background: 'rgba(255,159,10,0.06)', marginBottom: 20 }}>
          <Lightbulb size={14} color={AMBER} style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: AMBER }}>
            Sugerencia: considera agregar{' '}
            {suggestions.map((s) => findEntry(s)?.label).filter(Boolean).join(', ')}.
          </p>
        </div>
      )}

      {/* Líneas activas */}
      {lines.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={SECTION}>Desglose</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((line) => (
              <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--dash-border)', background: 'var(--dash-surface-1)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--dash-text-tertiary)' }}>por {UNIT_LABELS[line.unit]}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)' }}>$</span>
                  <input type="number" min={0} value={line.unitPrice} onChange={(e) => setPrice(line.id, Number(e.target.value))} style={{ ...INPUT, width: 90, padding: '5px 8px', textAlign: 'right', fontSize: 12 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button type="button" onClick={() => setQty(line.id, line.qty - 1)} style={stepBtn}><Minus size={12} /></button>
                  <span style={{ width: 28, textAlign: 'center', fontSize: 13, color: 'var(--dash-text-primary)' }}>{line.qty}</span>
                  <button type="button" onClick={() => setQty(line.id, line.qty + 1)} style={stepBtn}><Plus size={12} /></button>
                </div>
                <span style={{ width: 96, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{formatMoney(line.unitPrice * line.qty, currency)}</span>
                <button type="button" onClick={() => removeLine(line.id)} style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {/* Resumen fiscal */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--dash-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SummaryRow label="Subtotal" value={formatMoney(tax.subtotal, currency)} />
            <SummaryRow label="IVA 16%" value={formatMoney(tax.iva, currency)} />
            {tax.retIsr != null && <SummaryRow label="Ret. ISR 10%" value={`- ${formatMoney(tax.retIsr, currency)}`} danger />}
            {tax.retIva != null && <SummaryRow label="Ret. IVA 10.666%" value={`- ${formatMoney(tax.retIva, currency)}`} danger />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--dash-border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '0.03em' }}>TOTAL {currency}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>{formatMoney(tax.total, currency)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Campos fiscales B2B ───────────────────────────────────────────────────────

export interface FiscalFieldsState {
  rfc: string
  razonSocial: string
  usoCfdi: string
  regimen: string
  cp: string
  emailFisc: string
}

interface FiscalFieldsProps {
  state: FiscalFieldsState
  set: <K extends keyof FiscalFieldsState>(key: K, value: string) => void
  showRetToggle: boolean
  applyRet: boolean
  setApplyRet: (v: boolean) => void
}

export function FiscalFields({ state, set, showRetToggle, applyRet, setApplyRet }: FiscalFieldsProps) {
  return (
    <div style={{ marginBottom: 22, paddingTop: 18, borderTop: '1px solid var(--dash-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ ...SECTION, marginBottom: 0 }}>Datos fiscales B2B</p>
        {showRetToggle && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--dash-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={applyRet} onChange={(e) => setApplyRet(e.target.checked)} />
            Aplicar retenciones (ISR + IVA)
          </label>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><label style={LABEL}>RFC</label><input value={state.rfc} onChange={(e) => set('rfc', e.target.value)} style={INPUT} placeholder="XAXX010101000" /></div>
        <div><label style={LABEL}>Razón social</label><input value={state.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} style={INPUT} placeholder="EMPRESA S.A. DE C.V." /></div>
        <div><label style={LABEL}>Uso CFDI</label><input value={state.usoCfdi} onChange={(e) => set('usoCfdi', e.target.value)} style={INPUT} placeholder="G03 - Gastos en general" /></div>
        <div><label style={LABEL}>Régimen fiscal</label><input value={state.regimen} onChange={(e) => set('regimen', e.target.value)} style={INPUT} placeholder="601 - General de Ley" /></div>
        <div><label style={LABEL}>Código postal</label><input value={state.cp} onChange={(e) => set('cp', e.target.value)} style={INPUT} placeholder="06700" /></div>
        <div><label style={LABEL}>Email facturación</label><input value={state.emailFisc} onChange={(e) => set('emailFisc', e.target.value)} style={INPUT} placeholder="facturacion@empresa.mx" /></div>
      </div>
    </div>
  )
}

// ── Overlay modal compartido ──────────────────────────────────────────────────

export function BuilderOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
    >
      <div style={{ backgroundColor: 'var(--dash-surface-2)', border: '1px solid var(--dash-border-strong)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 680, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', marginTop: 16, marginBottom: 16, fontFamily: FONT }}>
        {children}
      </div>
    </div>
  )
}
