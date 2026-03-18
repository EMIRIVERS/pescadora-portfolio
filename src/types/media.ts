export interface PhotoEntry {
  id: string
  project: string
  url: string
  alt: string
  tags: string[]
}

export type VideoCategory = 'comercial' | 'video-clip' | 'entrevista' | 'podcast'

export interface VideoEntry {
  id: string
  title: string
  url: string
  poster: string | null
  category: VideoCategory
  tags: string[]
}

export interface MediaRegistry {
  photos: PhotoEntry[]
  videos: VideoEntry[]
}
