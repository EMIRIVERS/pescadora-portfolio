'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { registry } from '@/lib/registry'
import { projectStories } from '@/data/project-stories'
import type { PhotoEntry, VideoEntry } from '@/types/media'
import type { PhotoAlbum } from '@/types/media'

const SUPABASE_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/media/`

/**
 * Resolves a photo source. `cover_url` is stored as an absolute URL while
 * `storage_path` is bucket-relative and must be prefixed with the public
 * Supabase Storage URL — otherwise the browser requests a same-origin path
 * that 404s and the photo silently fails to render.
 */
function resolvePhotoSrc(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//.test(value) || value.startsWith('/')) return value
  return `${SUPABASE_STORAGE}${value}`
}

/** Shared dark shimmer — matches #111 aesthetic, keyframe is from globals.css */
const SHIMMER_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(90deg, #111 25%, #1c1c1c 50%, #111 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
}

function getInitialMobileOverlay(breakpoint: number): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
}

function useIsMobileOverlay(breakpoint = 640): boolean {
  const [mobile, setMobile] = useState(() => getInitialMobileOverlay(breakpoint))
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return mobile
}

/**
 * Traps keyboard focus within `containerRef` while mounted.
 * Returns focus to `returnRef` on cleanup.
 */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, returnRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Move focus into the overlay on mount
    const firstFocusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        container!.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null) // exclude hidden

      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the overlay
      returnRef.current?.focus()
    }
  // Refs are stable — deps intentionally omitted for mount/unmount-only behavior
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function InfoCell({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.55rem', textTransform: 'uppercase', color: '#6b6560', letterSpacing: '0.15em', display: 'block', marginBottom: '0.3rem' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 600, fontSize: '0.85rem', color: '#ede8e0', letterSpacing: '0.05em' }}>
        {value}
      </span>
    </div>
  )
}

const VIMEO_PARAMS = 'title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'

/* ─── Clip-path helpers ─── */
function rectToClipInset(origin: { x: number; y: number; w: number; h: number }): string {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
  const top = origin.y
  const right = vw - (origin.x + origin.w)
  const bottom = vh - (origin.y + origin.h)
  const left = origin.x
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 0px)`
}

// ---------------------------------------------------------------------------
// VideoGrid
// ---------------------------------------------------------------------------
function VideoGrid({ videos, onSelect }: { videos: VideoEntry[]; onSelect: (v: VideoEntry) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isMobile = useIsMobileOverlay()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 1, padding: '0 0 4rem' }}>
      {videos.map((video, i) => (
        <VideoTile
          key={video.id}
          video={video}
          index={i}
          hovered={hoveredId === video.id}
          onHover={(over) => setHoveredId(over ? video.id : null)}
          onClick={() => onSelect(video)}
        />
      ))}
    </div>
  )
}

function VideoTile({ video, index, hovered, onHover, onClick }: {
  video: VideoEntry; index: number; hovered: boolean; onHover: (over: boolean) => void; onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
  }, [onClick])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 + index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      role="button"
      tabIndex={0}
      aria-label={`Ver video: ${video.title}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', overflow: 'hidden', cursor: 'pointer', background: '#111', outline: 'none' }}
    >
      {/* Shimmer skeleton */}
      {!loaded && <div style={SHIMMER_STYLE} />}
      {/* Task D: same-origin /api/vimeo-thumb works with next/image (no remotePattern needed) */}
      <Image
        src={`/api/vimeo-thumb?id=${video.vimeoId}`}
        alt={video.title}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        onLoad={() => setLoaded(true)}
        style={{
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s, transform 0.7s ease',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
      />
      {hovered && video.vimeoId && (
        <iframe src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&muted=1&background=1&loop=1&${VIMEO_PARAMS}`}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: '-5%', width: '110%', height: '110%', border: 'none', pointerEvents: 'none' }}
          allow="autoplay" title={video.title} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)', transition: 'background 0.4s', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', zIndex: 2 }}>
        <div style={{ width: 44, height: 44, border: '1px solid rgba(237,232,224,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#ede8e0', fontSize: '1rem', marginLeft: 4 }}>&#9654;</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '0.85rem', left: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ede8e0', opacity: hovered ? 1 : 0.55, transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: 3 }}>
        {video.title}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// VideoDetail
// ---------------------------------------------------------------------------
function VideoDetail({ video, onBack, onClose }: { video: VideoEntry; onBack: () => void; onClose: () => void }) {
  const story = Object.entries(projectStories).find(([key]) => key.toLowerCase() === video.title.toLowerCase())?.[1] ?? null

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      data-lenis-prevent
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#050505', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem clamp(1rem, 4vw, 2rem)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(237,232,224,0.6)', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}>
          &larr; Volver
        </button>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          &#10005;
        </button>
      </header>

      <div style={{ position: 'relative', width: '100%', maxWidth: '100vw', paddingBottom: '56.25%', background: '#000' }}>
        <iframe
          src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&${VIMEO_PARAMS}`}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          allowFullScreen title={video.title}
        />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem) 4rem' }}>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
          style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 800, fontSize: 'clamp(1.2rem, 3vw, 2rem)', letterSpacing: '-0.01em', color: '#ede8e0', margin: '0 0 2rem' }}
        >
          {story?.title ?? video.title}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', marginTop: '2rem' }}
        >
          <InfoCell label="Cliente" value={story?.client ?? ''} />
          <InfoCell label="Categoría" value={story?.category ?? ''} />
          <InfoCell label="Año" value={story?.year ?? '2025'} />
          <InfoCell label="Rol" value={story?.role ?? ''} />
        </motion.div>
        {story?.description && (
          <p style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 300, fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)', lineHeight: 1.7, color: 'rgba(237,232,224,0.7)', margin: '2rem 0 0' }}>
            {story.description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// DbAlbumsGrid — albums from Supabase photo_albums
// ---------------------------------------------------------------------------
function DbAlbumsGrid({ albums, onSelect }: { albums: PhotoAlbum[]; onSelect: (album: PhotoAlbum) => void }) {
  const isMobile = useIsMobileOverlay()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2, padding: '0 0 4rem' }}>
      {albums.map((album, i) => {
        const coverPhoto = resolvePhotoSrc(album.cover_url ?? album.photos[0]?.storage_path)
        return (
          <AlbumTile key={album.id} album={album} coverPhoto={coverPhoto} index={i} onSelect={onSelect} />
        )
      })}
    </div>
  )
}

function AlbumTile({ album, coverPhoto, index, onSelect }: {
  album: PhotoAlbum
  coverPhoto: string | null
  index: number
  onSelect: (album: PhotoAlbum) => void
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(album) }
  }, [album, onSelect])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 + index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir álbum: ${album.label} — ${album.photos.length} fotos`}
      onClick={() => onSelect(album)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden', cursor: 'pointer', outline: 'none' }}
    >
      {coverPhoto && !imgLoaded && <div style={SHIMMER_STYLE} />}
      {coverPhoto && (
        <Image
          src={coverPhoto}
          alt={album.label}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          onLoad={() => setImgLoaded(true)}
          style={{
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'transform 0.6s ease, opacity 0.4s ease',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
          }}
        />
      )}
      {!coverPhoto && <div style={{ position: 'absolute', inset: 0, background: '#111' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: '1rem', left: '1rem', fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: 'clamp(0.9rem, 2vw, 1.4rem)', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#ede8e0', pointerEvents: 'none' }}>
        {album.label}
      </span>
      <span style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem', color: '#6b6560', letterSpacing: '0.15em', textTransform: 'uppercase', pointerEvents: 'none' }}>
        {album.photos.length} fotos
      </span>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// DbAlbumDetail — photos inside a specific album
// ---------------------------------------------------------------------------
function DbAlbumDetail({ album, onBack, onClose }: { album: PhotoAlbum; onBack: () => void; onClose: () => void }) {
  const isMobile = useIsMobileOverlay()
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'absolute', inset: 0, background: '#050505', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem clamp(1rem, 4vw, 2rem)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(237,232,224,0.6)', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}>
          &larr; {album.label}
        </button>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          &#10005;
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2, padding: '0 0 4rem' }}>
        {album.photos.map((photo: PhotoAlbum['photos'][number], i: number) => (
          <AlbumPhotoCell key={photo.id} photo={photo} albumLabel={album.label} index={i} />
        ))}
      </div>
    </motion.div>
  )
}

function AlbumPhotoCell({ photo, albumLabel, index }: {
  photo: PhotoAlbum['photos'][number]
  albumLabel: string
  index: number
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const src = resolvePhotoSrc(photo.storage_path)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden' }}
    >
      {src && !imgLoaded && <div style={SHIMMER_STYLE} />}
      {src && (
        <Image
          src={src}
          alt={photo.alt_text || albumLabel}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={{
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// PhotoProjectsGrid (static registry fallback)
// ---------------------------------------------------------------------------
function PhotoProjectsGrid({ onSelect }: { onSelect: (project: string) => void }) {
  const isMobile = useIsMobileOverlay()
  const projects = new Map<string, { url: string; count: number }>()
  for (const photo of registry.photos) {
    const existing = projects.get(photo.project)
    if (existing) { existing.count++ }
    else { projects.set(photo.project, { url: photo.url, count: 1 }) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 1, padding: '0 0 4rem' }}>
      {[...projects.entries()].map(([name, data], i) => (
        <PhotoProjectTile key={name} name={name} data={data} index={i} onSelect={onSelect} />
      ))}
    </div>
  )
}

function PhotoProjectTile({ name, data, index, onSelect }: {
  name: string
  data: { url: string; count: number }
  index: number
  onSelect: (project: string) => void
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(name) }
  }, [name, onSelect])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 + index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir proyecto: ${name} — ${data.count} fotos`}
      onClick={() => onSelect(name)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden', cursor: 'pointer', outline: 'none' }}
    >
      {!imgLoaded && <div style={SHIMMER_STYLE} />}
      <Image
        src={data.url}
        alt={name}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        onLoad={() => setImgLoaded(true)}
        style={{
          objectFit: 'cover',
          opacity: imgLoaded ? 1 : 0,
          transition: 'transform 0.6s ease, opacity 0.4s ease',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: '1rem', left: '1rem', fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: 'clamp(0.9rem, 2vw, 1.4rem)', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#ede8e0', pointerEvents: 'none' }}>
        {name}
      </span>
      <span style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem', color: '#6b6560', letterSpacing: '0.15em', textTransform: 'uppercase', pointerEvents: 'none' }}>
        {data.count} fotos
      </span>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// PhotoProjectDetail
// ---------------------------------------------------------------------------
function PhotoProjectDetail({ projectName, onBack, onClose }: { projectName: string; onBack: () => void; onClose: () => void }) {
  const isMobile = useIsMobileOverlay()
  const photos: PhotoEntry[] = registry.photos.filter((p) => p.project === projectName)
  const story = projectStories[projectName] ?? null

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'absolute', inset: 0, background: '#050505', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem clamp(1rem, 4vw, 2rem)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(237,232,224,0.6)', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}>
          &larr; Fotografia
        </button>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          &#10005;
        </button>
      </header>

      {photos[0] && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <Image src={photos[0].url} alt={projectName} fill priority style={{ objectFit: 'cover' }} />
        </div>
      )}

      {story && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)', maxWidth: 900, margin: '0 auto' }}>
          <InfoCell label="Cliente" value={story.client} />
          <InfoCell label="Categoria" value={story.category} />
          <InfoCell label="Ano" value={story.year} />
          <InfoCell label="Rol" value={story.role} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2, padding: '0 0 4rem' }}>
        {photos.map((photo, i) => (
          <RegistryPhotoCell key={photo.id} photo={photo} index={i} />
        ))}
      </div>
    </motion.div>
  )
}

function RegistryPhotoCell({ photo, index }: { photo: PhotoEntry; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden' }}>
      {!imgLoaded && <div style={SHIMMER_STYLE} />}
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        loading={index < 2 ? 'eager' : 'lazy'}
        onLoad={() => setImgLoaded(true)}
        style={{
          objectFit: 'cover',
          opacity: imgLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProjectOverlay — con transición clip-path desde la card
// ---------------------------------------------------------------------------
interface ProjectOverlayProps {
  projectName: string
  mediaType: 'video' | 'fotografia'
  origin: { x: number; y: number; w: number; h: number }
  onClose: () => void
  videos?: VideoEntry[]
  fotoEntries?: VideoEntry[]
  photoAlbums?: PhotoAlbum[]
}

export default function ProjectOverlay({ projectName, mediaType, origin, onClose, videos, fotoEntries, photoAlbums }: ProjectOverlayProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null)
  const [selectedPhotoProject, setSelectedPhotoProject] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  // Track the element that triggered the overlay so focus can be restored on close
  const triggerRef = useRef<HTMLElement | null>(null)

  const initialClip = rectToClipInset(origin)

  useEffect(() => {
    // Capture the currently focused element before the overlay steals focus
    triggerRef.current = document.activeElement as HTMLElement | null
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVideo) { setSelectedVideo(null); return }
        if (selectedAlbum) { setSelectedAlbum(null); return }
        if (selectedPhotoProject) { setSelectedPhotoProject(null); return }
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo, selectedPhotoProject, selectedAlbum])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      // Restore focus after React has unmounted the overlay
      triggerRef.current?.focus()
    }, 500)
  }, [onClose])

  // Focus trap for the main overlay panel
  useFocusTrap(overlayRef, triggerRef)

  const videoSource = videos && videos.length > 0 ? videos : registry.videos
  const overlayVideos: VideoEntry[] = mediaType === 'video'
    ? videoSource.filter((v) => v.category === projectName)
    : []

  const CATEGORY_LABEL: Record<string, string> = {
    'videoclips': 'Videoclips', 'corporativos': 'Corporativos',
    'restaurantes': 'Restaurantes', 'comerciales': 'Comerciales', 'fotografia': 'Fotografía',
  }

  const overlayTitle = CATEGORY_LABEL[projectName] ?? projectName

  if (selectedVideo) {
    return (
      <AnimatePresence mode="wait">
        <VideoDetail key="vd" video={selectedVideo} onBack={() => setSelectedVideo(null)} onClose={handleClose} />
      </AnimatePresence>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel principal con clip-path reveal */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={overlayTitle}
        data-lenis-prevent
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#050505',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          clipPath: isClosing ? initialClip : 'inset(0px 0px 0px 0px round 0px)',
          WebkitClipPath: isClosing ? initialClip : 'inset(0px 0px 0px 0px round 0px)',
          transition: `clip-path 0.55s cubic-bezier(0.77, 0, 0.175, 1), -webkit-clip-path 0.55s cubic-bezier(0.77, 0, 0.175, 1)`,
          animation: isClosing ? 'none' : 'overlayClipReveal 0.55s cubic-bezier(0.77, 0, 0.175, 1) forwards',
        }}
      >
        <style>{`
          @keyframes overlayClipReveal {
            from { clip-path: ${initialClip}; -webkit-clip-path: ${initialClip}; }
            to   { clip-path: inset(0px 0px 0px 0px round 0px); -webkit-clip-path: inset(0px 0px 0px 0px round 0px); }
          }
        `}</style>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(5,5,5,0.95)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.5rem clamp(1rem, 4vw, 2rem)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.5vw, 1rem)', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ede8e0' }}>
            {overlayTitle}
          </span>
          <button onClick={handleClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1, transition: 'transform 0.3s ease', minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(90deg)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(0deg)' }}>
            &#10005;
          </button>
        </motion.header>

        {/* VIDEO grid */}
        {mediaType === 'video' && (
          <VideoGrid videos={overlayVideos} onSelect={setSelectedVideo} />
        )}

        {/* FOTOGRAFÍA: DB albums (priority) */}
        {mediaType === 'fotografia' && photoAlbums && photoAlbums.length > 0 && !selectedAlbum && (
          <DbAlbumsGrid albums={photoAlbums} onSelect={setSelectedAlbum} />
        )}

        {mediaType === 'fotografia' && selectedAlbum && (
          <AnimatePresence mode="wait">
            <DbAlbumDetail
              key={selectedAlbum.id}
              album={selectedAlbum}
              onBack={() => setSelectedAlbum(null)}
              onClose={handleClose}
            />
          </AnimatePresence>
        )}

        {/* FOTOGRAFÍA: fallback a registro estático si no hay albums DB */}
        {mediaType === 'fotografia' && (!photoAlbums || photoAlbums.length === 0) && !selectedPhotoProject && (
          <PhotoProjectsGrid onSelect={setSelectedPhotoProject} />
        )}

        {mediaType === 'fotografia' && (!photoAlbums || photoAlbums.length === 0) && selectedPhotoProject && (
          <AnimatePresence mode="wait">
            <PhotoProjectDetail
              key={selectedPhotoProject}
              projectName={selectedPhotoProject}
              onBack={() => setSelectedPhotoProject(null)}
              onClose={handleClose}
            />
          </AnimatePresence>
        )}
      </div>
    </>
  )
}
