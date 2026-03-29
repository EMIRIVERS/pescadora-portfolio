import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Project, Deliverable } from '@/lib/supabase/types'

// ISR: revalidate portfolio data every hour
export const revalidate = 3600

export interface PortfolioProject extends Project {
  deliverables: Deliverable[]
}

export interface PortfolioResponse {
  projects: PortfolioProject[]
}

export async function GET(): Promise<NextResponse<PortfolioResponse | { error: string }>> {
  const supabase = await createClient()

  // Fetch all projects that are marked public, ordered by portfolio_order
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('is_public', true)
    .order('portfolio_order', { ascending: true })

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 })
  }

  const safeProjects = (projects ?? []) as Project[]

  if (safeProjects.length === 0) {
    return NextResponse.json({ projects: [] })
  }

  // Fetch final + approved deliverables for those projects in a single query
  const projectIds = safeProjects.map((p) => p.id)

  const { data: deliverables, error: delError } = await supabase
    .from('project_deliverables')
    .select('*')
    .in('project_id', projectIds)
    .eq('type', 'final')
    .eq('status', 'approved')
    .order('sort_order', { ascending: true })

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  const safeDeliverables = (deliverables ?? []) as Deliverable[]

  // Group deliverables by project_id
  const deliverablesByProject = new Map<string, Deliverable[]>()
  for (const d of safeDeliverables) {
    const existing = deliverablesByProject.get(d.project_id)
    if (existing) {
      existing.push(d)
    } else {
      deliverablesByProject.set(d.project_id, [d])
    }
  }

  const portfolioProjects: PortfolioProject[] = safeProjects.map((p) => ({
    ...p,
    deliverables: deliverablesByProject.get(p.id) ?? [],
  }))

  return NextResponse.json({ projects: portfolioProjects })
}
