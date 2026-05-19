'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import {
  createProposal,
  updateProposalStatus,
  deleteProposal,
} from '@/lib/actions/proposals'
import type { Proposal, ProposalStatus } from '@/lib/actions/proposals'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const STATUS_STYLES: Record<ProposalStatus, { color: string; bg: string; label: string }> = {
  draft:    { color: 'var(--dash-text-secondary)', bg: 'rgba(134,134,139,0.12)', label: 'Borrador' },
  sent:     { color: '#0071E3', bg: 'rgba(0,113,227,0.12)',   label: 'Enviada' },
  accepted: { color: 'var(--dash-success)', bg: 'rgba(48,209,88,0.12)',   label: 'Aceptada' },
  rejected: { color: 'var(--dash-danger)', bg: 'rgba(255,69,58,0.12)',   label: 'Rechazada' },
}

const INPUT: React.CSSProperties = {
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

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--dash-text-secondary)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase' as const,
  marginBottom: 6,
  fontFamily: FONT,
}

function fmt(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isExpired(iso: string | null) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

interface Props {
  initialProposals: Proposal[]
  clients: { id: string; name: string }[]
}

interface FormState {
  title: string
  clientId: string
  total: string
  currency: 'MXN' | 'USD'
  validUntil: string
  notes: string
}

const EMPTY_FORM: FormState = {
  title: '',
  clientId: '',
  total: '',
  currency: 'MXN',
  validUntil: '',
  notes: '',
}

// ─── Confirm-delete state per row ─────────────────────────────────────────────

interface DeleteState {
  id: string
  confirming: boolean
}

// ─── Modal overlay ────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--dash-surface-2)',
          border: '1px solid var(--dash-border-strong)',
          borderRadius: 18,
          padding: 28,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProposalsClient({ initialProposals, clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals)
  const [showModal, setShowModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteStates, setDeleteStates] = useState<Record<string, boolean>>({})

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openModal() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setFormError(null)
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (!form.title.trim()) {
      setFormError('El titulo es obligatorio.')
      return
    }

    const totalNum = parseFloat(form.total)
    if (isNaN(totalNum) || totalNum < 0) {
      setFormError('El monto debe ser un numero valido.')
      return
    }

    startTransition(async () => {
      const result = await createProposal({
        title: form.title.trim(),
        description: form.notes.trim(),
        items: [],
        total: totalNum,
        currency: form.currency,
        client_id: form.clientId || null,
        lead_id: null,
        valid_until: form.validUntil || null,
        status: 'draft',
      })
      if (result.error) {
        setFormError(result.error)
        return
      }
      closeModal()
      router.refresh()
    })
  }

  function handleStatusChange(id: string, status: ProposalStatus) {
    startTransition(async () => {
      await updateProposalStatus(id, status)
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      )
    })
  }

  function handleDeleteClick(id: string) {
    const confirming = deleteStates[id]
    if (!confirming) {
      setDeleteStates((prev) => ({ ...prev, [id]: true }))
      // Auto-cancel confirm after 3 s
      setTimeout(() => {
        setDeleteStates((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, 3000)
      return
    }
    // Second click — confirmed
    setDeleteStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    startTransition(async () => {
      await deleteProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
    })
  }

  const thStyle: React.CSSProperties = {
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--dash-text-tertiary)',
    fontFamily: FONT,
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '13px 16px',
    fontFamily: FONT,
    verticalAlign: 'middle',
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
          {proposals.length} propuesta{proposals.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={openModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            backgroundColor: '#0071E3',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Nueva Propuesta
        </button>
      </div>

      {/* Empty state */}
      {proposals.length === 0 ? (
        <div
          style={{
            border: '1px solid var(--dash-border)',
            borderRadius: 16,
            padding: '56px 24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: '0 0 18px',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--dash-text-secondary)',
              fontFamily: FONT,
            }}
          >
            No hay propuestas todavia.
          </p>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 13,
              color: 'var(--dash-text-tertiary)',
              fontFamily: FONT,
            }}
          >
            Crea tu primera propuesta para un cliente.
          </p>
          <button
            type="button"
            onClick={openModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 20px',
              backgroundColor: '#0071E3',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            <Plus size={14} strokeWidth={2} /> Nueva Propuesta
          </button>
        </div>
      ) : (
        /* Proposals table */
        <div
          style={{
            backgroundColor: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Titulo', 'Cliente', 'Monto', 'Estado', 'Valida hasta', 'Creada', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal, idx) => {
                const s = STATUS_STYLES[proposal.status]
                const expired = isExpired(proposal.valid_until) && proposal.status !== 'accepted'
                const isConfirming = deleteStates[proposal.id] === true

                return (
                  <tr
                    key={proposal.id}
                    style={{
                      borderTop: idx === 0 ? 'none' : '1px solid var(--dash-border)',
                    }}
                  >
                    {/* Title */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--dash-text-primary)',
                          display: 'block',
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={proposal.title}
                      >
                        {proposal.title}
                      </span>
                    </td>

                    {/* Client */}
                    <td style={{ ...tdStyle, fontSize: 13, color: 'var(--dash-text-secondary)' }}>
                      {proposal.clients?.name ?? '—'}
                    </td>

                    {/* Amount */}
                    <td style={{ ...tdStyle, fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)', whiteSpace: 'nowrap' }}>
                      {fmt(Number(proposal.total), proposal.currency)}
                    </td>

                    {/* Status — inline select badge */}
                    <td style={tdStyle}>
                      <select
                        value={proposal.status}
                        onChange={(e) =>
                          handleStatusChange(proposal.id, e.target.value as ProposalStatus)
                        }
                        disabled={isPending}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          border: `1px solid ${s.color}44`,
                          backgroundColor: s.bg,
                          color: s.color,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: FONT,
                          outline: 'none',
                          appearance: 'none',
                        }}
                      >
                        {(
                          Object.entries(STATUS_STYLES) as [
                            ProposalStatus,
                            (typeof STATUS_STYLES)[ProposalStatus],
                          ][]
                        ).map(([v, st]) => (
                          <option
                            key={v}
                            value={v}
                            style={{
                              backgroundColor: 'var(--dash-surface-2)',
                              color: 'var(--dash-text-primary)',
                            }}
                          >
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Valid until */}
                    <td
                      style={{
                        ...tdStyle,
                        fontSize: 13,
                        color: expired ? 'var(--dash-danger)' : 'var(--dash-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtDate(proposal.valid_until)}
                    </td>

                    {/* Created */}
                    <td style={{ ...tdStyle, fontSize: 13, color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap' }}>
                      {fmtDate(proposal.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(proposal.id)}
                        disabled={isPending}
                        title={isConfirming ? 'Confirmar eliminacion' : 'Eliminar propuesta'}
                        style={{
                          border: isConfirming
                            ? '1px solid rgba(255,69,58,0.4)'
                            : 'none',
                          background: isConfirming
                            ? 'rgba(255,69,58,0.12)'
                            : 'transparent',
                          color: isConfirming ? 'var(--dash-danger)' : 'var(--dash-text-tertiary)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          padding: isConfirming ? '3px 8px' : 4,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontFamily: FONT,
                          transition: 'all 0.15s',
                        }}
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                        {isConfirming && <span>Confirmar</span>}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create proposal modal */}
      {showModal && (
        <Modal onClose={closeModal}>
          {/* Modal header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                fontFamily: FONT,
                letterSpacing: '-0.01em',
              }}
            >
              Nueva Propuesta
            </span>
            <button
              type="button"
              onClick={closeModal}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--dash-text-tertiary)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Title */}
            <div>
              <label style={LABEL}>Titulo *</label>
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
                style={INPUT}
                placeholder="Propuesta de produccion audiovisual"
                autoFocus
              />
            </div>

            {/* Client */}
            <div>
              <label style={LABEL}>Cliente</label>
              <select
                value={form.clientId}
                onChange={(e) => setField('clientId', e.target.value)}
                style={{ ...INPUT, appearance: 'none' }}
              >
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount + currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
              <div>
                <label style={LABEL}>Monto total</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total}
                  onChange={(e) => setField('total', e.target.value)}
                  style={INPUT}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={LABEL}>Moneda</label>
                <select
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value as 'MXN' | 'USD')}
                  style={{ ...INPUT, appearance: 'none' }}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Valid until */}
            <div>
              <label style={LABEL}>Valida hasta</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setField('validUntil', e.target.value)}
                style={INPUT}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={LABEL}>Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={3}
                style={{ ...INPUT, resize: 'vertical' }}
                placeholder="Notas internas o descripcion general..."
              />
            </div>

            {formError && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--dash-danger)', fontFamily: FONT }}>
                {formError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                type="submit"
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  backgroundColor: '#0071E3',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#fff',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.5 : 1,
                  fontFamily: FONT,
                }}
              >
                {isPending ? 'Guardando...' : 'Crear propuesta'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--dash-border-strong)',
                  background: 'transparent',
                  color: 'var(--dash-text-secondary)',
                  cursor: 'pointer',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: FONT,
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
