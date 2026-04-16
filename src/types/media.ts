export interface PhotoEntry {
  id: string
  project: string
  url: string
  alt: string
  tags: string[]
}

export type VideoCategory = 'videoclips' | 'corporativos' | 'restaurantes' | 'comerciales'

export interface VideoEntry {
  id: string
  title: string
  url: string
  poster: string | null
  category: VideoCategory
  tags: string[]
  vimeoId?: string
}

export interface PortfolioCategory {
  slug: string
  label: string
  sort_order: number
  cover_url?: string | null
}

export interface MediaRegistry {
  photos: PhotoEntry[]
  videos: VideoEntry[]
}
