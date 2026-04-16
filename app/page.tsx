import { createClient } from '@/lib/supabase/server'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import HomeClient from '@/components/sections/HomeClient'
import type { VideoEntry, VideoCategory } from '@/types/media'

export const revalidate = 3600

import type { PortfolioCategory } from '@/types/media'
export type { PortfolioCategory }

interface DbVideo {
  id: string
  title: string
  vimeo_id: string
  category: string
  sort_order: number
  is_visible: boolean
  cover_url: string | null
}

function dbToVideoEntry(row: DbVideo): VideoEntry {
  return {
    id: row.id,
    title: row.title,
    url: '',
    poster: null,
    category: row.category as VideoCategory,
    tags: [],
    vimeoId: row.vimeo_id,
    cover_url: row.cover_url,
  }
}

export default async function Home() {
  let cmsProjects: CmsProjectCard[] = []
  let videos: VideoEntry[] = []
  let categories: PortfolioCategory[] = []

  try {
    const supabase = await createClient()

    const [projectsResult, videosResult, categoriesResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, description, cover_url')
        .eq('is_public', true)
        .order('portfolio_order', { ascending: true }),
      supabase
        .from('portfolio_videos')
        .select('id, title, vimeo_id, category, sort_order, is_visible, cover_url')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('portfolio_categories')
        .select('slug, label, sort_order, cover_url')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true }),
    ])

    cmsProjects = (projectsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      cover_url: row.cover_url,
    }))

    videos = (videosResult.data ?? []).map((row) => dbToVideoEntry(row as DbVideo))

    categories = (categoriesResult.data ?? []) as PortfolioCategory[]
  } catch {
    // Supabase unavailable — render portfolio with registry fallback
  }

  return <HomeClient cmsProjects={cmsProjects} videos={videos} categories={categories} />
}
