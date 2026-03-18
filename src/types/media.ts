export interface PhotoEntry {
  id: string
  project: string
  url: string
  alt: string
  tags: string[]
}

export interface VideoEntry {
  id: string
  title: string
  url: string
  poster: string | null
  tags: string[]
}

export interface MediaRegistry {
  photos: PhotoEntry[]
  videos: VideoEntry[]
}
