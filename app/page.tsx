import { createClient } from '@/lib/supabase/server'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import HomeClient from '@/components/sections/HomeClient'

// ISR: revalidate every hour so newly published projects appear without a
// full rebuild.
export const revalidate = 3600

export default async function Home() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('projects')
    .select('id, title, description, cover_url')
    .eq('is_public', true)
    .order('portfolio_order', { ascending: true })

  const cmsProjects: CmsProjectCard[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    cover_url: row.cover_url,
  }))

  return <HomeClient cmsProjects={cmsProjects} />
}
