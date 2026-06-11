import { notFound } from 'next/navigation'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import type { ProjectStatus, InvoiceStatus, LeadSource } from '@/lib/supabase/types'
import ClientDetailClient from '@/components/admin/clients/ClientDetailClient'
import type {
  ClientDetailData,
  ProjectDetail,
  InvoiceDetail,
  LeadDetail,
} from '@/components/admin/clients/ClientDetailClient'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

interface RawClient {
  id: string
  created_at: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  notes: string | null
  profile_id: string | null
}

interface RawProject {
  id: string
  title: string
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string | null
}

interface RawInvoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  project_id: string | null
  projects: { title: string } | null
}

interface RawLead {
  id: string
  name: string
  source: LeadSource
  notes: string | null
  created_at: string
  status: string
  project_type: string | null
}

// ── Server action ─────────────────────────────────────────────────────────────

async function saveClientField(
  clientId: string,
  field: 'name' | 'company' | 'email' | 'phone',
  value: string
): Promise<{ error?: string }> {
  'use server'
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const supabase = createServiceClient()
  const update: Record<string, string | null> = { [field]: value || null }
  const { error } = await supabase
    .from('clients')
    .update(update)
    .eq('id', clientId)
  if (error) return { error: error.message }
  return {}
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceClient()

  const [
    { data: clientData },
    { data: projectsData },
    { data: invoicesData },
    { data: leadsData },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, created_at, name, email, company, phone, notes, profile_id')
      .eq('id', id)
      .single(),
    supabase
      .from('projects')
      .select('id, title, status, start_date, end_date, budget, currency')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, status, issue_date, due_date, project_id, projects(title)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select('id, name, source, notes, created_at, status, project_type')
      .eq('converted_to_client_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!clientData) notFound()

  const raw = clientData as RawClient

  const client: ClientDetailData = {
    id: raw.id,
    created_at: raw.created_at,
    name: raw.name,
    email: raw.email,
    company: raw.company,
    phone: raw.phone,
    notes: raw.notes,
    profile_id: raw.profile_id,
  }

  const projects: ProjectDetail[] = (projectsData ?? []).map((p) => {
    const r = p as RawProject
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      start_date: r.start_date,
      end_date: r.end_date,
      budget: r.budget,
      currency: r.currency,
    }
  })

  const invoices: InvoiceDetail[] = (invoicesData ?? []).map((i) => {
    const r = i as RawInvoice
    return {
      id: r.id,
      invoice_number: r.invoice_number,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      issue_date: r.issue_date,
      due_date: r.due_date,
      project_id: r.project_id,
      projects: r.projects,
    }
  })

  const leads: LeadDetail[] = (leadsData ?? []).map((l) => {
    const r = l as RawLead
    return {
      id: r.id,
      name: r.name,
      source: r.source,
      notes: r.notes,
      created_at: r.created_at,
      status: r.status,
      project_type: r.project_type,
    }
  })

  return (
    <ClientDetailClient
      client={client}
      projects={projects}
      invoices={invoices}
      leads={leads}
      onSaveField={saveClientField}
    />
  )
}
