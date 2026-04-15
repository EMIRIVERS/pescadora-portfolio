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

export default async function AdminLeadsPage() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const leads: Lead[] = data ?? []

  const countsByStatus = ALL_STATUSES.reduce<Record<LeadStatus, number>>(
    (acc, status) => {
      acc[status] = leads.filter((l) => l.status === status).length
      return acc
    },
    {} as Record<LeadStatus, number>
  )

  const total = leads.length

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="px-8 py-10 max-w-[1400px] w-full">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-lg font-mono tracking-[0.2em] text-[#e8e8e8] uppercase">
              OUTBOUND
            </h1>
            <p className="mt-1 text-xs font-mono text-[#555] tracking-wide">
              Pipeline de ventas
            </p>
          </div>

          {/*
            Passing showAdd as a URL search param lets LeadsPipeline (client
            component) read it via useSearchParams and auto-open AddLeadModal.
          */}
          <Link
            href="/admin/leads?showAdd=1"
            className="flex items-center gap-2 px-4 py-2 bg-[#e8341a] text-white text-xs font-mono tracking-[0.2em] uppercase rounded-sm hover:bg-[#cc2d15] transition-colors"
          >
            Nuevo lead
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-900/40 bg-red-950/20 rounded-sm">
            <p className="text-xs font-mono text-red-400/80">
              Error al cargar leads: {error.message}
            </p>
          </div>
        )}

        {/* Stats strip */}
        <LeadsStats counts={countsByStatus} total={total} />

        {/* Pipeline kanban board */}
        <LeadsPipeline leads={leads} />

      </div>
    </div>
  )
}
