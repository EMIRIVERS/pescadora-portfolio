'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LeadSource } from '@/lib/supabase/types'
import { Upload, X, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react'

// ─── Column aliases — maps whatever header the user has → our field ───────────
const COL_MAP: Record<string, string> = {
  // name
  nombre: 'name', name: 'name', 'full name': 'name', 'nombre completo': 'name', contact: 'name', contacto: 'name',
  // email
  email: 'email', correo: 'email', 'e-mail': 'email', 'correo electronico': 'email', 'correo electrónico': 'email',
  // phone
  phone: 'phone', telefono: 'phone', teléfono: 'phone', tel: 'phone', mobile: 'phone', celular: 'phone', whatsapp: 'phone',
  // company
  company: 'company', empresa: 'company', 'company name': 'company', negocio: 'company', organizacion: 'company', organización: 'company',
  // notes
  notes: 'notes', notas: 'notes', comentarios: 'notes', comments: 'notes', descripcion: 'notes', descripción: 'notes',
  // budget
  budget: 'budget_range', presupuesto: 'budget_range', 'budget range': 'budget_range', 'rango presupuesto': 'budget_range',
  // project type
  'project type': 'project_type', tipo: 'project_type', 'tipo de proyecto': 'project_type', servicio: 'project_type',
  // source
  source: 'source', fuente: 'source', origen: 'source',
}

function normalizeSource(raw: string): LeadSource {
  const v = raw.toLowerCase().trim()
  if (v.includes('referral') || v.includes('referido') || v.includes('recomendacion')) return 'referral'
  if (v.includes('instagram') || v.includes('ig') || v.includes('redes') || v.includes('social')) return 'instagram'
  if (v.includes('whatsapp') || v.includes('wa')) return 'whatsapp'
  if (v.includes('web') || v.includes('sitio') || v.includes('website')) return 'web'
  if (v.includes('manual') || v.includes('directo') || v.includes('direct')) return 'manual'
  return 'other'
}

interface ParsedRow {
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  budget_range?: string
  project_type?: string
  source: LeadSource
}

interface ImportResult {
  ok: number
  failed: number
  errors: string[]
}

export default function LeadsImporter({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [step, setStep] = useState<'picking' | 'preview' | 'importing' | 'done'>('picking')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function parseFile(file: File) {
    setError(null)
    // xlsx (~600KB) se carga bajo demanda para no inflar el bundle inicial del admin.
    let XLSX: typeof import('xlsx')
    try {
      XLSX = await import('xlsx')
    } catch {
      setError('No se pudo cargar el lector de Excel. Revisa tu conexión e intenta de nuevo.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (json.length === 0) {
          setError('El archivo está vacío o no tiene filas.')
          return
        }

        const parsed: ParsedRow[] = json
          .map((raw) => {
            // Normalize all keys
            const normalized: Record<string, string> = {}
            for (const [k, v] of Object.entries(raw)) {
              const mapped = COL_MAP[k.toLowerCase().trim()]
              if (mapped) normalized[mapped] = String(v).trim()
            }
            if (!normalized.name) return null
            return {
              name: normalized.name,
              email: normalized.email || undefined,
              phone: normalized.phone || undefined,
              company: normalized.company || undefined,
              notes: normalized.notes || undefined,
              budget_range: normalized.budget_range || undefined,
              project_type: normalized.project_type || undefined,
              source: normalizeSource(normalized.source ?? ''),
            }
          })
          .filter(Boolean) as ParsedRow[]

        if (parsed.length === 0) {
          setError('No se encontró una columna "Nombre" o "Name". Revisa los encabezados del archivo.')
          return
        }

        setRows(parsed)
        setStep('preview')
        setOpen(true)
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos .xlsx, .xls o .csv')
      return
    }
    void parseFile(file)
  }

  async function runImport() {
    setStep('importing')
    const supabase = createClient()
    let ok = 0
    const errors: string[] = []

    for (const row of rows) {
      const { error } = await supabase.from('leads').insert({
        name: row.name,
        email: row.email ?? null,
        phone: row.phone ?? null,
        company: row.company ?? null,
        notes: row.notes ?? null,
        budget_range: row.budget_range ?? null,
        project_type: row.project_type ?? null,
        source: row.source,
        status: 'new',
      })
      if (error) {
        errors.push(`${row.name}: ${error.message}`)
      } else {
        ok++
      }
    }

    setResult({ ok, failed: errors.length, errors })
    setStep('done')
  }

  function reset() {
    setOpen(false)
    setRows([])
    setStep('picking')
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  }
  const modal: React.CSSProperties = {
    background: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)',
    borderRadius: '20px', width: '100%', maxWidth: '680px',
    maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Importar desde Excel"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--dash-surface-2)', color: 'var(--dash-text-secondary)',
          border: '1px solid var(--dash-border-strong)', borderRadius: '8px',
          padding: '8px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--dash-surface-3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--dash-surface-2)')}
      >
        <Upload size={13} strokeWidth={2} />
        Importar
      </button>

      {/* Modal */}
      {open && (
        <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) { reset() } }}>
          <div style={modal}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid var(--dash-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--dash-accent)' }} />
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--dash-text-primary)' }}>
                  Importar leads desde Excel
                </span>
              </div>
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dash-text-tertiary)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

              {/* Drop zone — shown when picking */}
              {step === 'picking' && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onClick={() => inputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--dash-accent)' : 'var(--dash-border-strong)'}`,
                      borderRadius: '14px', padding: '48px 24px', textAlign: 'center',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                      background: dragOver ? 'color-mix(in srgb, var(--dash-accent) 6%, transparent)' : 'var(--dash-surface-2)',
                    }}
                  >
                    <Upload size={32} style={{ color: 'var(--dash-text-tertiary)', marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)', margin: '0 0 6px' }}>
                      Arrastra tu archivo aquí o haz clic para seleccionar
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
                      Acepta .xlsx, .xls, .csv
                    </p>
                    <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  </div>
                  {error && (
                    <div style={{
                      marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
                      background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}>
                      <AlertTriangle size={15} style={{ color: 'var(--dash-danger)', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '13px', color: 'var(--dash-danger)', margin: 0 }}>{error}</p>
                    </div>
                  )}
                  {!error && (
                    <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--dash-text-tertiary)' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 500 }}>Columnas reconocidas automáticamente:</p>
                      <p style={{ margin: 0 }}>Nombre, Email, Teléfono, Empresa, Notas, Presupuesto, Tipo de proyecto, Fuente</p>
                    </div>
                  )}
                </>
              )}

              {/* Preview table */}
              {step === 'preview' && rows.length > 0 && (
                <>
                  <div style={{
                    marginBottom: '16px', padding: '10px 14px', borderRadius: '10px',
                    background: 'color-mix(in srgb, var(--dash-accent) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--dash-accent) 20%, transparent)',
                    fontSize: '13px', color: 'var(--dash-accent)',
                  }}>
                    Se encontraron <strong>{rows.length}</strong> leads. Revisa la vista previa antes de importar.
                  </div>
                  <div style={{ borderRadius: '12px', border: '1px solid var(--dash-border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'var(--dash-surface-2)' }}>
                          {['Nombre', 'Email', 'Teléfono', 'Empresa', 'Fuente'].map(h => (
                            <th key={h} style={{
                              padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                              color: 'var(--dash-text-tertiary)', letterSpacing: '0.04em',
                              fontSize: '10px', textTransform: 'uppercase',
                              borderBottom: '1px solid var(--dash-border)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 8).map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--dash-border)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--dash-text-primary)', fontWeight: 500 }}>{r.name}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--dash-text-secondary)' }}>{r.email ?? '—'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--dash-text-secondary)' }}>{r.phone ?? '—'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--dash-text-secondary)' }}>{r.company ?? '—'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--dash-text-secondary)' }}>{r.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 8 && (
                      <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--dash-text-tertiary)', background: 'var(--dash-surface-2)' }}>
                        + {rows.length - 8} más no mostrados en la vista previa
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Importing */}
              {step === 'importing' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    border: '3px solid var(--dash-border)', borderTopColor: 'var(--dash-accent)',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <p style={{ color: 'var(--dash-text-secondary)', fontSize: '14px', margin: 0 }}>
                    Importando {rows.length} leads...
                  </p>
                </div>
              )}

              {/* Done */}
              {step === 'done' && result && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: result.failed === 0 ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <Check size={24} style={{ color: result.failed === 0 ? 'var(--dash-success)' : 'var(--dash-warning)' }} />
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--dash-text-primary)', margin: '0 0 6px' }}>
                    {result.ok} lead{result.ok !== 1 ? 's' : ''} importado{result.ok !== 1 ? 's' : ''}
                  </p>
                  {result.failed > 0 && (
                    <p style={{ fontSize: '13px', color: 'var(--dash-warning)', margin: '0 0 12px' }}>
                      {result.failed} no se pudieron importar
                    </p>
                  )}
                  {result.errors.slice(0, 3).map((e, i) => (
                    <p key={i} style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', margin: '2px 0' }}>{e}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--dash-border)',
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
            }}>
              <button onClick={reset} style={{
                padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--dash-border-strong)',
                background: 'var(--dash-surface-2)', color: 'var(--dash-text-secondary)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>
                {step === 'done' ? 'Cerrar' : 'Cancelar'}
              </button>
              {step === 'preview' && rows.length > 0 && (
                <button onClick={runImport} style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: 'var(--dash-accent)', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Importar {rows.length} leads
                </button>
              )}
              {step === 'done' && (
                <button onClick={() => { onDone(); reset() }} style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: 'var(--dash-accent)', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Ver leads
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
