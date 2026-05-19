/**
 * Shared media helpers for the public portfolio.
 *
 * Before this module these constants/functions were copy-pasted across
 * PortfolioSection, ProjectOverlay and (dead) VideoSection — a one-line
 * change meant editing 3 files. This is now the single source of truth.
 */
import type { CSSProperties } from 'react'

/** Public Supabase Storage base for the `media` bucket. */
export const SUPABASE_MEDIA_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/media/`

/**
 * Resolves a stored media reference to a usable `src`.
 *
 * `cover_url` is persisted as an absolute URL while `storage_path` is
 * bucket-relative; a bare relative value must be prefixed with the public
 * Storage base, otherwise the browser requests a same-origin path that 404s
 * and the image silently fails to render (historic "photos don't show" bug).
 */
export function resolveMediaSrc(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//.test(value) || value.startsWith('/')) return value
  return `${SUPABASE_MEDIA_BASE}${value}`
}

/** True for `.gif` URLs (optionally with a query string). */
export function isGif(url: string): boolean {
  return /\.gif(\?|$)/i.test(url)
}

/** Vimeo player chrome-stripping params for the full/detail player. */
export const VIMEO_PARAMS = 'title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'

/** Vimeo params for a silent looping background/hover preview. */
export const VIMEO_BG_PARAMS = 'autoplay=1&muted=1&background=1&loop=1&title=0&byline=0&portrait=0'

/** Builds a Vimeo embed URL. `background` → muted autoplay loop preview. */
export function vimeoEmbedUrl(id: string, opts: { background?: boolean; autoplay?: boolean } = {}): string {
  if (opts.background) {
    return `https://player.vimeo.com/video/${id}?${VIMEO_BG_PARAMS}`
  }
  const autoplay = opts.autoplay ? 'autoplay=1&' : ''
  return `https://player.vimeo.com/video/${id}?${autoplay}${VIMEO_PARAMS}`
}

/** Dark shimmer skeleton; the `shimmer` keyframe lives in app/globals.css. */
export const SHIMMER_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(90deg, #111 25%, #1c1c1c 50%, #111 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
}
