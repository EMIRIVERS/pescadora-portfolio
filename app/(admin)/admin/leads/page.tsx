import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Lead, LeadStatus } from '@/lib/supabase/types'
import LeadsPipeline from '@/components/admin/leads/LeadsPipeline'
import LeadsStats from '@/components/admin/leads/LeadsStats'

const ALL_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
]

// The pipeline is a kanban board, so instead of page-based pagination we cap
// the query at the most recent leads and surface a notice when truncated.
const LEADS_LIMIT = 300

export default async function AdminLeadsPage() {
  const supabase = createServiceClient()

  const { data, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(LEADS_LIMIT)

  const leads: Lead[] = data ?? []
  const totalCount = count ?? leads.length
  const isTruncated = totalCount > leads.length

  const countsByStatus = ALL_STATUSES.reduce<Record<LeadStatus, number>>(
    (acc, status) => {
      acc[status] = leads.filter((l) => l.status === status).length
      return acc
    },
    {} as Record<LeadStatus, number>
  )

  // Stats are computed over the loaded leads so the per-status percentages in
  // LeadsStats stay consistent; the real total is shown in the notice below.
  const total = leads.length

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--dash-bg)',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          width: '100%',
          padding: 'clamp(24px, 6vw, 48px) clamp(16px, 4vw, 40px) 64px',
        }}
      >
        {/* Page header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '40px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Pipeline de Leads
            </h1>
            <p
              style={{
                marginTop: '8px',
                fontSize: '14px',
                fontWeight: 400,
                color: 'var(--dash-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Gestiona y da seguimiento a los prospectos del proyecto.
            </p>
          </div>

          {/*
            Passing showAdd as a URL search param lets LeadsPipeline (client
            component) read it via useSearchParams and auto-open AddLeadModal.
          */}
          <Link
            href="/admin/leads?showAdd=1"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: 'var(--dash-accent)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              borderRadius: '980px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease',
            }}
          >
            Nuevo lead
          </Link>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px 20px',
              backgroundColor: 'rgba(var(--dash-accent-rgb), 0.08)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'var(--dash-danger)',
                margin: 0,
              }}
            >
              Error al cargar leads: {error.message}
            </p>
          </div>
        )}

        {/* Stats strip */}
        <LeadsStats counts={countsByStatus} total={total} />

        {/* Truncation notice — the board only shows the most recent leads */}
        {isTruncated && (
          <div
            style={{
              marginBottom: '24px',
              padding: '12px 20px',
              backgroundColor: 'var(--dash-surface-1)',
              border: '1px solid rgba(255, 159, 10, 0.25)',
              borderRadius: '12px',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'var(--dash-warning)',
                margin: 0,
              }}
            >
              Mostrando los {leads.length} leads más recientes de {totalCount}. Los
              leads más antiguos no aparecen en el tablero.
            </p>
          </div>
        )}

        {/* Empty state — shown when there are no leads at all */}
        {leads.length === 0 && !error && (
          <div
            style={{
              padding: '80px 20px',
              textAlign: 'center',
              background: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '16px',
              marginBottom: '32px',
            }}
          >
            {/* Funnel SVG */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              aria-hidden="true"
              style={{ display: 'block', margin: '0 auto 20px' }}
            >
              {/* Funnel outline */}
              <path
                d="M14 18h52l-20 24v18l-12-8V42L14 18z"
                fill="var(--dash-surface-3)"
                stroke="var(--dash-text-tertiary)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* Funnel top line (filter) */}
              <line x1="14" y1="18" x2="66" y2="18" stroke="var(--dash-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
              {/* Spout drip */}
              <circle cx="40" cy="70" r="3" fill="var(--dash-text-tertiary)" />
            </svg>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              Pipeline vacío
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--dash-text-secondary)',
                margin: '0 0 24px',
                lineHeight: 1.5,
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              Registra tu primer prospecto para empezar a hacer seguimiento.
            </p>
            <a
              href="/admin/leads?showAdd=1"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: 'var(--dash-accent)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                borderRadius: '980px',
                textDecoration: 'none',
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              + Nuevo lead
            </a>
          </div>
        )}

        {/* Pipeline kanban board */}
        <LeadsPipeline leads={leads} />
      </div>
    </div>
  )
}
