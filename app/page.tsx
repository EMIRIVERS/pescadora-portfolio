import { createClient } from '@/lib/supabase/server'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import HomeClient from '@/components/sections/HomeClient'

// ISR: revalidate every hour so newly published projects appear without a
// full rebuild.
export const revalidate = 3600

export default async function Home() {
  let cmsProjects: CmsProjectCard[] = []

  try {
    const supabase = await createClient()
    const timeout = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 2000)
    )
    const query = supabase
      .from('projects')
      .select('id, title, description, cover_url')
      .eq('is_public', true)
      .order('portfolio_order', { ascending: true })

    const { data } = await Promise.race([query, timeout])
    cmsProjects = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      cover_url: row.cover_url,
    }))
  } catch {
    // Supabase unavailable — render portfolio without CMS projects
  }

  return <HomeClient cmsProjects={cmsProjects} />
}
