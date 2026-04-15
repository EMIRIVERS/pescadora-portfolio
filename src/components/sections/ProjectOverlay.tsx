'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { registry } from '@/lib/registry'
import { projectStories } from '@/data/project-stories'
import type { PhotoEntry, VideoEntry } from '@/types/media'

function InfoCell({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.65rem', textTransform: 'uppercase', color: '#8a8078', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '0.95rem', color: '#f2ede6' }}>
        {value}
      </span>
    </div>
  )
}

const VIMEO_PARAMS = 'title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'

// ---------------------------------------------------------------------------
// VideoGrid — grid de thumbnails con hover preview
// ---------------------------------------------------------------------------
function VideoGrid({
  videos,
  onSelect,
}: {
  videos: VideoEntry[]
  onSelect: (v: VideoEntry) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 2,
      padding: '0 0 4rem',
    }}>
      {videos.map((video) => {
        const hovered = hoveredId === video.id
        return (
          <VideoTile
            key={video.id}
            video={video}
            hovered={hovered}
            onHover={(over) => setHoveredId(over ? video.id : null)}
            onClick={() => onSelect(video)}
          />
        )
      })}
    </div>
  )
}

function VideoTile({
  video,
  hovered,
  onHover,
  onClick,
}: {
  video: VideoEntry
  hovered: boolean
  onHover: (over: boolean) => void
  onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', overflow: 'hidden', cursor: 'pointer', background: '#111' }}
    >
      {/* Skeleton */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
      )}

      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/vimeo-thumb?id=${video.vimeoId}`}
        alt={video.title}
        onLoad={() => setLoaded(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
      />

      {/* Preview hover — muted, solo 1 activo */}
      {hovered && video.vimeoId && (
        <iframe
          src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&muted=1&background=1&loop=1&${VIMEO_PARAMS}`}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: '-5%', width: '110%', height: '110%', border: 'none', pointerEvents: 'none' }}
          allow="autoplay"
          title={video.title}
        />
      )}

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)', transition: 'background 0.4s', zIndex: 1 }} />

      {/* Play */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', zIndex: 2 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '1px solid rgba(242,237,230,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#f2ede6', fontSize: '1rem', marginLeft: 4 }}>&#9654;</span>
        </div>
      </div>

      {/* Titulo */}
      <div style={{ position: 'absolute', bottom: '0.85rem', left: '1rem', fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f2ede6', opacity: hovered ? 1 : 0.55, transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: 3 }}>
        {video.title}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VideoDetail — video seleccionado con info y boton volver
// ---------------------------------------------------------------------------
function VideoDetail({
  video,
  onBack,
  onClose,
}: {
  video: VideoEntry
  onBack: () => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#080808', overflowY: 'auto' }}
    >
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'rgba(242,237,230,0.6)', fontFamily: 'var(--font-geist-mono)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}
        >
          &larr; Volver
        </button>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ background: 'none', border: 'none', color: '#f2ede6', fontSize: '1.4rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1 }}
        >
          &#10005;
        </button>
      </header>

      {/* Video */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
        <iframe
          src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&${VIMEO_PARAMS}`}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          allowFullScreen
          title={video.title}
        />
      </div>

      {/* Info con stagger */}
      {(() => {
        const story = projectStories[video.title] ?? null
        return (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
              style={{
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 300,
                fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                letterSpacing: '0.06em',
                color: '#f2ede6',
                margin: '0 0 2rem',
              }}
            >
              {story?.title ?? video.title}
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}
            >
              <InfoCell label="Cliente" value={story?.client ?? ''} />
              <InfoCell label="Categoria" value={story?.category ?? ''} />
              <InfoCell label="Ano" value={story?.year ?? '2025'} />
              <InfoCell label="Rol" value={story?.role ?? ''} />
            </motion.div>
            {story?.description && (
              <p style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 300, fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)', lineHeight: 1.7, color: 'rgba(242,237,230,0.7)', margin: '2rem 0 0' }}>
                {story.description}
              </p>
            )}
          </div>
        )
      })()}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ProjectOverlay
// ---------------------------------------------------------------------------
interface ProjectOverlayProps {
  projectName: string
  mediaType: 'foto' | 'video'
  onClose: () => void
}

export default function ProjectOverlay({ projectName, mediaType, onClose }: ProjectOverlayProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVideo) setSelectedVideo(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, selectedVideo])

  const story  = projectStories[projectName] ?? null
  const photos: PhotoEntry[] = mediaType === 'foto' ? registry.photos.filter((p) => p.project === projectName) : []
  const videos: VideoEntry[] = mediaType === 'video' ? registry.videos.filter((v) => v.category === projectName) : []
  const heroSrc = mediaType === 'foto' && photos.length > 0 ? photos[0].url : null

  // Vista de detalle de video seleccionado
  if (selectedVideo) {
    return (
      <VideoDetail
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
        onClose={onClose}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: '#080808', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,8,8,0.9)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
      }}>
        <span style={{ fontSize: 'clamp(1rem, 1.5vw, 1.4rem)', fontWeight: 600, color: '#f2ede6' }}>
          {projectName}
        </span>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#f2ede6', fontSize: '1.4rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1 }}>
          &#10005;
        </button>
      </header>

      {/* Hero foto */}
      {mediaType === 'foto' && heroSrc && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <Image src={heroSrc} alt={`${projectName} hero`} fill priority style={{ objectFit: 'cover' }} />
        </div>
      )}

      {/* Info Grid */}
      {story && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', padding: '3rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <InfoCell label="Cliente" value={story.client} />
          <InfoCell label="Categoria" value={story.category} />
          <InfoCell label="Ano" value={story.year} />
          <InfoCell label="Rol" value={story.role} />
        </div>
      )}

      {/* Narrative */}
      {story?.description && (
        <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.3rem)', fontWeight: 300, lineHeight: 1.7, color: '#f2ede6', maxWidth: 680, margin: '0 auto', padding: '0 2rem 3rem' }}>
          {story.description}
        </p>
      )}

      {/* Gallery fotos */}
      {mediaType === 'foto' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, padding: '0 0 4rem' }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden' }}>
              <Image src={photo.url} alt={photo.alt} fill style={{ objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* Gallery videos */}
      {mediaType === 'video' && (
        <VideoGrid videos={videos} onSelect={setSelectedVideo} />
      )}
    </motion.div>
  )
}
