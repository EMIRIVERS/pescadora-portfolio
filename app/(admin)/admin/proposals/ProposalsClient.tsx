'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, FileText } from 'lucide-react'
import {
  updateProposalStatus,
  deleteProposal,
} from '@/lib/actions/proposals'
import type { Proposal, ProposalStatus } from '@/lib/actions/proposals'
import { createInvoiceFromProposal } from '@/lib/actions/invoices'
import QuoteBuilder from '@/components/admin/billing/QuoteBuilder'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const STATUS_STYLES: Record<ProposalStatus, { color: string; bg: string; label: string }> = {
  draft:    { color: 'var(--dash-text-secondary)', bg: 'rgba(134,134,139,0.12)', label: 'Borrador' },
  sent:     { color: '#0071E3', bg: 'rgba(0,113,227,0.12)',   label: 'Enviada' },
  accepted: { color: 'var(--dash-success)', bg: 'rgba(48,209,88,0.12)',   label: 'Aceptada' },
  rejected: { color: 'var(--dash-danger)', bg: 'rgba(255,69,58,0.12)',   label: 'Rechazada' },
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

export default function ProposalsClient({ initialProposals, clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [deleteStates, setDeleteStates] = useState<Record<string, boolean>>({})

  function openNew() {
    setEditing(null)
    setBuilderOpen(true)
  }

  function openEdit(p: Proposal) {
    setEditing(p)
    setBuilderOpen(true)
  }

  function handleStatusChange(id: string, status: ProposalStatus) {
    startTransition(async () => {
      await updateProposalStatus(id, status)
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
    })
  }

  function handleGenerateInvoice(id: string) {
    startTransition(async () => {
      const result = await createInvoiceFromProposal(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      if (result.invoiceId) {
        router.push(`/admin/invoices/${result.invoiceId}`)
      } else {
        router.push('/admin/invoices')
      }
    })
  }

  function handleDeleteClick(id: string) {
    const confirming = deleteStates[id]
    if (!confirming) {
      setDeleteStates((prev) => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setDeleteStates((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, 3000)
      return
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
          {proposals.length} cotización{proposals.length !== 1 ? 'es' : ''}
        </span>
        <button
          type="button"
          onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: FONT }}
        >
          <Plus size={14} strokeWidth={2} /> Nueva cotización
        </button>
      </div>

      {/* Empty state */}
      {proposals.length === 0 ? (
        <div style={{ border: '1px solid var(--dash-border)', borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 500, color: 'var(--dash-text-secondary)', fontFamily: FONT }}>
            No hay cotizaciones todavía.
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
            Arma tu primera cotización en pocos clics desde el catálogo de servicios.
          </p>
          <button
            type="button"
            onClick={openNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', backgroundColor: '#0071E3', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: FONT }}
          >
            <Plus size={14} strokeWidth={2} /> Nueva cotización
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Título', 'Cliente', 'Total', 'Estado', 'Válida hasta', 'Creada', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal, idx) => {
                const s = STATUS_STYLES[proposal.status]
                const expired = isExpired(proposal.valid_until) && proposal.status !== 'accepted'
                const isConfirming = deleteStates[proposal.id] === true
                const itemCount = Array.isArray(proposal.items) ? proposal.items.length : 0

                return (
                  <tr key={proposal.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--dash-border)' }}>
                    {/* Title */}
                    <td style={tdStyle}>
                      <span
                        style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)', display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={proposal.title}
                      >
                        {proposal.title}
                      </span>
                      {itemCount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--dash-text-tertiary)' }}>
                          {itemCount} servicio{itemCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>

                    {/* Client */}
                    <td style={{ ...tdStyle, fontSize: 13, color: 'var(--dash-text-secondary)' }}>
                      {proposal.clients?.name ?? '—'}
                    </td>

                    {/* Total */}
                    <td style={{ ...tdStyle, fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)', whiteSpace: 'nowrap' }}>
                      {fmt(Number(proposal.total), proposal.currency)}
                    </td>

                    {/* Status */}
                    <td style={tdStyle}>
                      <select
                        value={proposal.status}
                        onChange={(e) => handleStatusChange(proposal.id, e.target.value as ProposalStatus)}
                        disabled={isPending}
                        style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${s.color}44`, backgroundColor: s.bg, color: s.color, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: FONT, outline: 'none', appearance: 'none' }}
                      >
                        {(Object.entries(STATUS_STYLES) as [ProposalStatus, (typeof STATUS_STYLES)[ProposalStatus]][]).map(([v, st]) => (
                          <option key={v} value={v} style={{ backgroundColor: 'var(--dash-surface-2)', color: 'var(--dash-text-primary)' }}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Valid until */}
                    <td style={{ ...tdStyle, fontSize: 13, color: expired ? 'var(--dash-danger)' : 'var(--dash-text-secondary)', whiteSpace: 'nowrap' }}>
                      {fmtDate(proposal.valid_until)}
                    </td>

                    {/* Created */}
                    <td style={{ ...tdStyle, fontSize: 13, color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap' }}>
                      {fmtDate(proposal.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        {proposal.status === 'accepted' && (
                          <button
                            type="button"
                            onClick={() => handleGenerateInvoice(proposal.id)}
                            disabled={isPending}
                            title="Generar factura desde esta cotización"
                            style={{ border: '1px solid rgba(48,209,88,0.3)', background: 'rgba(48,209,88,0.1)', color: 'var(--dash-success)', cursor: isPending ? 'not-allowed' : 'pointer', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: FONT, whiteSpace: 'nowrap' }}
                          >
                            <FileText size={12} strokeWidth={1.8} />
                            Generar factura
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(proposal)}
                          title="Editar cotización"
                          style={{ border: 'none', background: 'transparent', color: 'var(--dash-text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex' }}
                        >
                          <Pencil size={13} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(proposal.id)}
                          disabled={isPending}
                          title={isConfirming ? 'Confirmar eliminación' : 'Eliminar cotización'}
                          style={{ border: isConfirming ? '1px solid rgba(255,69,58,0.4)' : 'none', background: isConfirming ? 'rgba(255,69,58,0.12)' : 'transparent', color: isConfirming ? 'var(--dash-danger)' : 'var(--dash-text-tertiary)', cursor: isPending ? 'not-allowed' : 'pointer', padding: isConfirming ? '3px 8px' : 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: FONT, transition: 'all 0.15s' }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                          {isConfirming && <span>Confirmar</span>}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Builder */}
      <QuoteBuilder
        open={builderOpen}
        editing={editing}
        clients={clients}
        onClose={() => setBuilderOpen(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
