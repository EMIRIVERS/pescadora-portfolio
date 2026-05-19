'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { projectStories } from '@/data/project-stories'
import { VIMEO_PARAMS, SHIMMER_STYLE } from '@/lib/media'
import type { VideoEntry } from '@/types/media'
import { useIsMobileOverlay } from './lib'
import { InfoCell } from './InfoCell'

export function VideoGrid({ videos, onSelect }: { videos: VideoEntry[]; onSelect: (v: VideoEntry) => void }) {
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

export function VideoDetail({ video, onBack, onClose }: { video: VideoEntry; onBack: () => void; onClose: () => void }) {
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
