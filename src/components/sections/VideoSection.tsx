'use client'
import { useRef, useState, useEffect } from 'react'
import { registry } from '@/lib/registry'
import type { VideoEntry, VideoCategory } from '@/types/media'

const CATEGORY_LABELS: Record<VideoCategory, string> = {
  'comercial':  'Comercial',
  'video-clip': 'Video Clip',
  'entrevista': 'Entrevista',
  'podcast':    'Podcast',
}

const CATEGORY_ORDER: VideoCategory[] = ['comercial', 'video-clip', 'entrevista', 'podcast']

// ---------------------------------------------------------------------------
// VideoTile — individual video inside the overlay
// ---------------------------------------------------------------------------
function VideoTile({ video }: { video: VideoEntry }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        data-cursor="image"
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => videoRef.current?.play()}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
        }}
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          overflow: 'hidden',
          cursor: 'none',
          background: '#0d0d0d',
        }}
      >
        <video
          ref={videoRef}
          src={video.url}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            if (videoRef.current) videoRef.current.currentTime = 0.5
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div
          className="video-title"
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#f2ede6',
            opacity: 0,
            transition: 'opacity 0.3s',
            pointerEvents: 'none',
          }}
        >
          {video.title}
        </div>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Video: ${video.title}`}
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            src={video.url}
            autoPlay
            controls
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
          />
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// CategoryCover — portada de categoría con video de fondo en hover
// ---------------------------------------------------------------------------
function CategoryCover({
  category,
  videos,
  onClick,
}: {
  category: VideoCategory
  videos: VideoEntry[]
  onClick: () => void
}) {
  const coverRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!coverRef.current) return
    if (hovered) {
      coverRef.current.play().catch(() => null)
    } else {
      coverRef.current.pause()
      coverRef.current.currentTime = 0
    }
  }, [hovered])

  const coverVideo = videos[0]

  return (
    <div
      data-cursor="image"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '16/9',
        overflow: 'hidden',
        cursor: 'none',
        background: '#0a0a0a',
      }}
    >
      {/* Background video preview */}
      {coverVideo && (
        <video
          ref={coverRef}
          src={coverVideo.url}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            if (coverRef.current) coverRef.current.currentTime = 0.5
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      )}

      {/* Dark overlay — fades on hover */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: hovered ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.7)',
          transition: 'background 0.6s ease',
        }}
      />

      {/* Category label + count */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '1.5rem',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 200,
            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            letterSpacing: '0.08em',
            color: '#f2ede6',
            margin: 0,
            lineHeight: 1,
          }}
        >
          {CATEGORY_LABELS[category]}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'rgba(242,237,230,0.45)',
            margin: '0.5rem 0 0',
            textTransform: 'uppercase',
          }}
        >
          {videos.length} {videos.length === 1 ? 'pieza' : 'piezas'}
        </p>
      </div>

      {/* Arrow indicator */}
      <div
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.75rem',
          color: 'rgba(242,237,230,0.4)',
          transform: hovered ? 'translate(4px,-4px)' : 'translate(0,0)',
          transition: 'transform 0.3s ease',
        }}
      >
        →
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CategoryOverlay — galería completa al picar una portada
// ---------------------------------------------------------------------------
function CategoryOverlay({
  category,
  videos,
  onClose,
}: {
  category: VideoCategory
  videos: VideoEntry[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={CATEGORY_LABELS[category]}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0a',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '2rem 2.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          zIndex: 10,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 200,
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
              letterSpacing: '0.08em',
              color: '#f2ede6',
            }}
          >
            {CATEGORY_LABELS[category]}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              color: 'rgba(242,237,230,0.35)',
              marginLeft: '1.5rem',
              textTransform: 'uppercase',
            }}
          >
            {videos.length} piezas
          </span>
        </div>

        <button
          onClick={onClose}
          data-cursor="link"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(242,237,230,0.5)',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'none',
            padding: 0,
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Video grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1px',
          padding: '1px',
        }}
      >
        {videos.map((video) => (
          <VideoTile key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VideoSection — entry point
// ---------------------------------------------------------------------------
export function VideoSection() {
  const [openCategory, setOpenCategory] = useState<VideoCategory | null>(null)

  const grouped = CATEGORY_ORDER.reduce<Record<VideoCategory, VideoEntry[]>>(
    (acc, cat) => {
      acc[cat] = registry.videos.filter((v) => v.category === cat)
      return acc
    },
    { comercial: [], 'video-clip': [], entrevista: [], podcast: [] }
  )

  const activeCategories = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)

  return (
    <>
      <section
        id="video"
        style={{
          background: 'var(--color-video-bg)',
          padding: 'var(--space-16) var(--space-4)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section label */}
          <p
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(242,237,230,0.35)',
              marginBottom: 'var(--space-8)',
            }}
          >
            Video
          </p>

          {/* Category covers grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: activeCategories.length === 1
                ? '1fr'
                : 'repeat(2, 1fr)',
              gap: '1px',
            }}
          >
            {activeCategories.map((cat) => (
              <CategoryCover
                key={cat}
                category={cat}
                videos={grouped[cat]}
                onClick={() => setOpenCategory(cat)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Fullscreen category overlay */}
      {openCategory && (
        <CategoryOverlay
          category={openCategory}
          videos={grouped[openCategory]}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </>
  )
}
