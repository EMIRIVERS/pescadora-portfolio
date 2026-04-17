import { createServiceClient } from '@/lib/supabase/server'
import ProposalsClient from './ProposalsClient'
import type { Proposal } from '../../../actions/proposals'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

function fmtCurrency(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function ProposalsPage() {
  const db = createServiceClient()

  const [proposalsRes, clientsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)
      .from('proposals')
      .select('*, clients(name)')
      .order('created_at', { ascending: false }),
    db.from('clients').select('id, name').order('name'),
  ])

  const proposals = ((proposalsRes.data ?? []) as Proposal[])
  const clients = ((clientsRes.data ?? []) as { id: string; name: string }[])

  const acceptedProposals = proposals.filter((p) => p.status === 'accepted')
  const acceptedValue = acceptedProposals.reduce((sum, p) => sum + Number(p.total), 0)

  // Use the currency of the first accepted proposal, or MXN default
  const acceptedCurrency = acceptedProposals[0]?.currency ?? 'MXN'

  type StatCard = {
    label: string
    value: string
    color: string
  }

  const stats: StatCard[] = [
    {
      label: 'Total propuestas',
      value: String(proposals.length),
      color: 'var(--dash-text-primary)',
    },
    {
      label: 'Borradores',
      value: String(proposals.filter((p) => p.status === 'draft').length),
      color: 'var(--dash-text-tertiary)',
    },
    {
      label: 'Enviadas',
      value: String(proposals.filter((p) => p.status === 'sent').length),
      color: '#0071E3',
    },
    {
      label: 'Aceptadas',
      value:
        acceptedProposals.length > 0
          ? fmtCurrency(acceptedValue, acceptedCurrency)
          : String(acceptedProposals.length),
      color: 'var(--dash-success)',
    },
  ]

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--dash-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Propuestas
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--dash-text-secondary)' }}>
          Gestiona presupuestos y propuestas para clientes
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: '1 1 140px',
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderTop: `2px solid ${s.color}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-secondary)',
                fontFamily: FONT,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: s.label === 'Aceptadas' && acceptedProposals.length > 0 ? 20 : 32,
                fontWeight: 600,
                color: s.color,
                letterSpacing: '-0.02em',
                fontFamily: FONT,
                lineHeight: 1.2,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Client component handles form + list */}
      <ProposalsClient initialProposals={proposals} clients={clients} />
    </div>
  )
}
