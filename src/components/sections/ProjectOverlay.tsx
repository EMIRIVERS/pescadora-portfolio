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

// ---------------------------------------------------------------------------
// VideoGrid
// ---------------------------------------------------------------------------
function VideoGrid({ videos, onSelect }: { videos: VideoEntry[]; onSelect: (v: VideoEntry) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, padding: '0 0 4rem' }}>
      {videos.map((video) => (
        <VideoTile
          key={video.id}
          video={video}
          hovered={hoveredId === video.id}
          onHover={(over) => setHoveredId(over ? video.id : null)}
          onClick={() => onSelect(video)}
        />
      ))}
    </div>
  )
}

function VideoTile({ video, hovered, onHover, onClick }: {
  video: VideoEntry; hovered: boolean; onHover: (over: boolean) => void; onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', overflow: 'hidden', cursor: 'pointer', background: '#111' }}
    >
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/vimeo-thumb?id=${video.vimeoId}`} alt={video.title} onLoad={() => setLoaded(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} />
      {hovered && video.vimeoId && (
        <iframe src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&muted=1&background=1&loop=1&${VIMEO_PARAMS}`}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: '-5%', width: '110%', height: '110%', border: 'none', pointerEvents: 'none' }}
          allow="autoplay" title={video.title} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)', transition: 'background 0.4s', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', zIndex: 2 }}>
        <div style={{ width: 44, height: 44, borderRadius: 0, border: '1px solid rgba(237,232,224,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#ede8e0', fontSize: '1rem', marginLeft: 4 }}>&#9654;</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '0.85rem', left: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ede8e0', opacity: hovered ? 1 : 0.55, transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: 3 }}>
        {video.title}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VideoDetail
// ---------------------------------------------------------------------------
function VideoDetail({ video, onBack, onClose }: { video: VideoEntry; onBack: () => void; onClose: () => void }) {
  const story = Object.entries(projectStories).find(([key]) => key.toLowerCase() === video.title.toLowerCase())?.[1] ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#050505', overflowY: 'auto' }}
    >
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(237,232,224,0.6)', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>
          &larr; Volver
        </button>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1 }}>
          &#10005;
        </button>
      </header>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
        <iframe
          src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&${VIMEO_PARAMS}`}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          allowFullScreen title={video.title}
        />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>
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
// PhotoProjectsGrid — lista de proyectos de foto para seleccionar
// ---------------------------------------------------------------------------
function PhotoProjectsGrid({ onSelect }: { onSelect: (project: string) => void }) {
  const projects = new Map<string, { url: string; count: number }>()
  for (const photo of registry.photos) {
    const existing = projects.get(photo.project)
    if (existing) { existing.count++ }
    else { projects.set(photo.project, { url: photo.url, count: 1 }) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, padding: '0 0 4rem' }}>
      {[...projects.entries()].map(([name, data]) => (
        <div
          key={name}
          onClick={() => onSelect(name)}
          style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden', cursor: 'pointer' }}
        >
          <Image src={data.url} alt={name} fill style={{ objectFit: 'cover', transition: 'transform 0.6s ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', bottom: '1rem', left: '1rem', fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: 'clamp(0.9rem, 2vw, 1.4rem)', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#ede8e0', pointerEvents: 'none' }}>
            {name}
          </span>
          <span style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem', color: '#6b6560', letterSpacing: '0.15em', textTransform: 'uppercase', pointerEvents: 'none' }}>
            {data.count} fotos
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PhotoProjectDetail — fotos de un proyecto específico
// ---------------------------------------------------------------------------
function PhotoProjectDetail({ projectName, onBack, onClose }: { projectName: string; onBack: () => void; onClose: () => void }) {
  const photos: PhotoEntry[] = registry.photos.filter((p) => p.project === projectName)
  const story = projectStories[projectName] ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'absolute', inset: 0, background: '#050505', overflowY: 'auto' }}
    >
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(237,232,224,0.6)', fontFamily: 'var(--font-geist-mono)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>
          &larr; Fotografía
        </button>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1 }}>
          &#10005;
        </button>
      </header>

      {photos[0] && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <Image src={photos[0].url} alt={projectName} fill priority style={{ objectFit: 'cover' }} />
        </div>
      )}

      {story && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', padding: '2.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <InfoCell label="Cliente" value={story.client} />
          <InfoCell label="Categoría" value={story.category} />
          <InfoCell label="Año" value={story.year} />
          <InfoCell label="Rol" value={story.role} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, padding: '0 0 4rem' }}>
        {photos.map((photo) => (
          <div key={photo.id} style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden' }}>
            <Image src={photo.url} alt={photo.alt} fill style={{ objectFit: 'cover' }} />
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ProjectOverlay
// ---------------------------------------------------------------------------
interface ProjectOverlayProps {
  projectName: string
  mediaType: 'video' | 'fotografia'
  onClose: () => void
  videos?: VideoEntry[]
}

export default function ProjectOverlay({ projectName, mediaType, onClose, videos }: ProjectOverlayProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null)
  const [selectedPhotoProject, setSelectedPhotoProject] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVideo) { setSelectedVideo(null); return }
        if (selectedPhotoProject) { setSelectedPhotoProject(null); return }
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, selectedVideo, selectedPhotoProject])

  const videoSource = videos && videos.length > 0 ? videos : registry.videos
  const overlayVideos: VideoEntry[] = mediaType === 'video'
    ? videoSource.filter((v) => v.category === projectName)
    : []

  const CATEGORY_LABEL: Record<string, string> = {
    'videoclips': 'Videoclips', 'corporativos': 'Corporativos',
    'restaurantes': 'Restaurantes', 'comerciales': 'Comerciales', 'fotografia': 'Fotografía',
  }

  // Video detail level
  if (selectedVideo) {
    return <VideoDetail video={selectedVideo} onBack={() => setSelectedVideo(null)} onClose={onClose} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#050505', overflowY: 'auto' }}
    >
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.5vw, 1rem)', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ede8e0' }}>
          {CATEGORY_LABEL[projectName] ?? projectName}
        </span>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1 }}>
          &#10005;
        </button>
      </header>

      {/* VIDEO: grid de thumbnails */}
      {mediaType === 'video' && (
        <VideoGrid videos={overlayVideos} onSelect={setSelectedVideo} />
      )}

      {/* FOTOGRAFÍA: proyectos → fotos */}
      {mediaType === 'fotografia' && !selectedPhotoProject && (
        <PhotoProjectsGrid onSelect={setSelectedPhotoProject} />
      )}

      {mediaType === 'fotografia' && selectedPhotoProject && (
        <PhotoProjectDetail
          projectName={selectedPhotoProject}
          onBack={() => setSelectedPhotoProject(null)}
          onClose={onClose}
        />
      )}
    </motion.div>
  )
}
