'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { registry } from '@/lib/registry'
import { projectStories } from '@/data/project-stories'
import type { PhotoEntry, VideoEntry } from '@/types/media'

interface ProjectOverlayProps {
  projectName: string
  mediaType: 'foto' | 'video'
  onClose: () => void
}

export default function ProjectOverlay({
  projectName,
  mediaType,
  onClose,
}: ProjectOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  /* ── Close on Escape ─────────────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  /* ── Story data ──────────────────────────────────────────────────── */
  const story = projectStories[projectName] ?? null

  /* ── Gallery items ───────────────────────────────────────────────── */
  const photos: PhotoEntry[] =
    mediaType === 'foto'
      ? registry.photos.filter((p) => p.project === projectName)
      : []

  const videos: VideoEntry[] =
    mediaType === 'video'
      ? registry.videos.filter((v) => v.category === projectName)
      : []

  /* ── Hero source ─────────────────────────────────────────────────── */
  const heroSrc =
    mediaType === 'foto' && photos.length > 0 ? photos[0].url : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#080808',
        overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1)' : 'scale(0.98)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* ── Sticky Header ──────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(8,8,8,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
        }}
      >
        <span
          style={{
            fontSize: 'clamp(1rem, 1.5vw, 1.4rem)',
            fontWeight: 600,
            color: '#f2ede6',
          }}
        >
          {projectName}
        </span>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            background: 'none',
            border: 'none',
            color: '#f2ede6',
            fontSize: '1.4rem',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            lineHeight: 1,
          }}
        >
          {'\u2715'}
        </button>
      </header>

      {/* ── Hero Image ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#111',
        }}
      >
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt={`${projectName} hero`}
            fill
            priority
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#111',
            }}
          />
        )}
      </div>

      {/* ── Info Grid ──────────────────────────────────────────────── */}
      {story && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem',
            padding: '3rem 2rem',
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <InfoCell label="Cliente" value={story.client} />
          <InfoCell label="Categoria" value={story.category} />
          <InfoCell label="Ano" value={story.year} />
          <InfoCell label="Rol" value={story.role} />
        </div>
      )}

      {/* ── Narrative Text ─────────────────────────────────────────── */}
      {story?.description && (
        <p
          style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.3rem)',
            fontWeight: 300,
            lineHeight: 1.7,
            color: '#f2ede6',
            maxWidth: 680,
            margin: '0 auto',
            padding: '0 2rem 3rem',
          }}
        >
          {story.description}
        </p>
      )}

      {/* ── Gallery Grid ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          padding: '0 0 4rem',
        }}
      >
        {mediaType === 'foto' &&
          photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '75%',
                overflow: 'hidden',
              }}
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}

        {mediaType === 'video' &&
          videos.map((vid) => (
            <video
              key={vid.id}
              src={vid.url}
              controls
              preload="metadata"
              poster={undefined}
              style={{
                width: '100%',
                display: 'block',
              }}
            />
          ))}
      </div>
    </div>
  )
}

/* ── Small helper ──────────────────────────────────────────────────── */
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        style={{
          fontFamily: 'var(--font-geist-mono), "Geist Mono", monospace',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          color: '#8a8078',
          letterSpacing: '0.05em',
          display: 'block',
          marginBottom: '0.35rem',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-geist-sans), "Geist Sans", sans-serif',
          fontSize: '1rem',
          color: '#f2ede6',
        }}
      >
        {value}
      </span>
    </div>
  )
}
