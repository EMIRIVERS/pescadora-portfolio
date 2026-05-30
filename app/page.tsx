import { Suspense } from 'react'
import { createPublicClient } from '@/lib/supabase/server'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import HomeClient from '@/components/sections/HomeClient'
import { Hero } from '@/components/sections/Hero'
import type { VideoEntry, VideoCategory, PortfolioCategory, PhotoAlbum } from '@/types/media'

export const revalidate = 3600

export type { PortfolioCategory, PhotoAlbum }

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

async function PortfolioData() {
  let cmsProjects: CmsProjectCard[] = []
  let videos: VideoEntry[] = []
  let categories: PortfolioCategory[] = []
  let photoAlbums: PhotoAlbum[] = []

  try {
    // Anon, cookie-free client so this public CMS page stays statically
    // cacheable with ISR (revalidate=3600) instead of opting into dynamic
    // rendering. Reads only public, RLS-readable data (is_public / is_visible)
    // with the same anon key the site already uses — no privilege change.
    const supabase = createPublicClient()

    const [projectsResult, videosResult, categoriesResult, albumsResult] = await Promise.all([
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('photo_albums')
        .select('id, slug, label, sort_order, cover_url, portfolio_photos(id, storage_path, alt_text, sort_order)')
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photoAlbums = ((albumsResult.data ?? []) as any[]).map((a) => ({
      id: a.id,
      slug: a.slug,
      label: a.label,
      sort_order: a.sort_order,
      cover_url: a.cover_url ?? null,
      photos: (a.portfolio_photos ?? []).sort((x: { sort_order: number }, y: { sort_order: number }) => x.sort_order - y.sort_order),
    }))
  } catch (err) {
    // Supabase unavailable — render portfolio with registry fallback.
    // Log so a production data outage is diagnosable instead of silently
    // degrading to an empty/partial portfolio.
    console.error('[home] Supabase fetch failed, using registry fallback:', err)
  }

  return <HomeClient cmsProjects={cmsProjects} videos={videos} categories={categories} photoAlbums={photoAlbums} />
}

// The Hero fallback lets the branded above-the-fold content stream immediately
// while Supabase resolves behind the Suspense boundary.
export default function Home() {
  return (
    <Suspense fallback={<Hero />}>
      <PortfolioData />
    </Suspense>
  )
}
