'use client'
import { useRef, useState } from 'react'
import { registry } from '@/lib/registry'
import type { VideoEntry } from '@/types/media'

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
          background: '#0a0a0a',
        }}
      >
        <video
          ref={videoRef}
          src={video.url}
          muted
          loop
          playsInline
          preload="none"
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

      {/* Fullscreen overlay — click tile to open, click backdrop or Escape to close */}
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
  return (
    <section
      id="video"
      style={{
        background: 'var(--color-video-bg)',
        padding: 'var(--space-16) var(--space-4)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 200,
            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--color-video-text)',
            opacity: 0.5,
            marginBottom: 'var(--space-8)',
          }}
        >
          Video
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
          }}
        >
          {registry.videos.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  )
}
