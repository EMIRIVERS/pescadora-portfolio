'use client'
import { useRef, useState } from 'react'
import { registry } from '@/lib/registry'
import type { VideoEntry, VideoCategory } from '@/types/media'

const CATEGORY_LABELS: Record<VideoCategory, string> = {
  'comercial':   'Comercial',
  'video-clip':  'Video Clip',
  'entrevista':  'Entrevista',
  'podcast':     'Podcast',
}

/** Order categories appear on screen */
const CATEGORY_ORDER: VideoCategory[] = ['comercial', 'video-clip', 'entrevista', 'podcast']

function VideoTile({ video }: { video: VideoEntry }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleMouseEnter = () => {
    videoRef.current?.play()
  }

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <>
      <div
        data-cursor="image"
        onClick={() => setIsOpen(true)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
            // Seek to 0.5s so the browser renders a real frame as thumbnail
            if (videoRef.current) videoRef.current.currentTime = 0.5
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <div
          className="video-title"
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--color-video-text)',
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
            zIndex: 1000,
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

export function VideoSection() {
  // Group videos by category, preserving CATEGORY_ORDER
  const grouped = CATEGORY_ORDER.reduce<Record<VideoCategory, VideoEntry[]>>(
    (acc, cat) => {
      acc[cat] = registry.videos.filter((v) => v.category === cat)
      return acc
    },
    { comercial: [], 'video-clip': [], entrevista: [], podcast: [] }
  )

  return (
    <section
      id="video"
      style={{
        background: 'var(--color-video-bg)',
        padding: 'var(--space-16) var(--space-4)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {CATEGORY_ORDER.map((cat) => {
          const videos = grouped[cat]
          if (videos.length === 0) return null

          return (
            <div
              key={cat}
              style={{ marginBottom: 'var(--space-16)' }}
            >
              {/* Category label */}
              <p
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: 'var(--color-video-text)',
                  opacity: 0.4,
                  marginBottom: 'var(--space-4)',
                }}
              >
                {CATEGORY_LABELS[cat]}
              </p>

              {/* Video grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1px',
                }}
              >
                {videos.map((video) => (
                  <VideoTile key={video.id} video={video} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
