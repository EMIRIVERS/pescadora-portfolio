'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2 } from 'lucide-react'
import { updateInvoiceStatus, deleteInvoice } from '@/lib/actions/invoices'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

interface Props {
  id: string
  invoiceNumber: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

export default function InvoiceActions({ id, invoiceNumber, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [actionError, setActionError] = useState<string | null>(null)

  const canMarkPaid = currentStatus === 'sent' || currentStatus === 'overdue'

  function handleMarkPaid() {
    setActionError(null)
    setCurrentStatus('paid')
    startTransition(async () => {
      const result = await updateInvoiceStatus(id, 'paid')
      if (result.error) {
        setCurrentStatus(status)
        setActionError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!window.confirm(`¿Eliminar factura ${invoiceNumber}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const result = await deleteInvoice(id)
      if (result.error) {
        setActionError(result.error)
      } else {
        router.push('/admin/invoices')
      }
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {canMarkPaid && (
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={isPending}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            backgroundColor: 'rgba(48,209,88,0.12)',
            border: '1px solid rgba(48,209,88,0.3)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--dash-success)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.5 : 1,
            fontFamily: FONT,
          }}
        >
          <Check size={14} strokeWidth={2.5} />
          Marcar pagada
        </button>
      )}
      {currentStatus === 'paid' && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            backgroundColor: 'rgba(48,209,88,0.08)',
            border: '1px solid rgba(48,209,88,0.2)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--dash-success)',
            fontFamily: FONT,
          }}
        >
          <Check size={14} strokeWidth={2.5} />
          Pagada
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 18px',
          backgroundColor: 'transparent',
          border: '1px solid rgba(255,69,58,0.3)',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--dash-danger)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.5 : 1,
          fontFamily: FONT,
        }}
      >
        <Trash2 size={14} strokeWidth={1.5} />
        Eliminar
      </button>
      {actionError && (
        <span style={{ fontSize: 12, color: 'var(--dash-danger)', fontFamily: FONT }}>{actionError}</span>
      )}
    </div>
  )
}
