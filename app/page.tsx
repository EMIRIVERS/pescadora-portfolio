import { createClient } from '@/lib/supabase/server'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import HomeClient from '@/components/sections/HomeClient'
import type { VideoEntry, VideoCategory } from '@/types/media'

// ISR: revalidate every hour so newly published projects appear without a
// full rebuild.
export const revalidate = 3600

interface DbVideo {
  id: string
  title: string
  vimeo_id: string
  category: string
  sort_order: number
  is_visible: boolean
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
  }
}

export default async function Home() {
  let cmsProjects: CmsProjectCard[] = []
  let videos: VideoEntry[] = []

  try {
    const supabase = await createClient()

    const timeout2s = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 2000)
    )

    const projectsQuery = supabase
      .from('projects')
      .select('id, title, description, cover_url')
      .eq('is_public', true)
      .order('portfolio_order', { ascending: true })

    const videosQuery = supabase
      .from('portfolio_videos')
      .select('id, title, vimeo_id, category, sort_order, is_visible')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })

    const [projectsResult, videosResult] = await Promise.all([
      Promise.race([projectsQuery, timeout2s]),
      Promise.race([
        videosQuery,
        new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 2000)
        ),
      ]),
    ])

    cmsProjects = (projectsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      cover_url: row.cover_url,
    }))

    videos = (videosResult.data ?? []).map((row) => dbToVideoEntry(row as DbVideo))
  } catch {
    // Supabase unavailable — render portfolio with registry fallback
  }

  return <HomeClient cmsProjects={cmsProjects} videos={videos} />
}
