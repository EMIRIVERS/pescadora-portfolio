'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { registry, getAllProjects, getPhotosByProject } from '@/lib/registry'
import type { PhotoEntry } from '@/types/media'

// ---------------------------------------------------------------------------
// Project cover card
// ---------------------------------------------------------------------------
function ProjectCover({
  project,
  cover,
  onClick,
}: {
  project: string
  cover: PhotoEntry
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const count = getPhotosByProject(project).length

  return (
    <div
      data-cursor="image"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '4/3',
        overflow: 'hidden',
        cursor: 'none',
        background: '#d0c8be',
      }}
    >
      <Image
        src={cover.url}
        alt={cover.alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        style={{
          objectFit: 'cover',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          transition: 'transform 0.7s ease, filter 0.4s ease',
          filter: hovered ? 'brightness(0.75)' : 'brightness(0.88)',
        }}
      />

      {/* Gradient + label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(26,21,16,0.65) 0%, transparent 55%)',
          transition: 'opacity 0.4s',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '1.25rem',
          left: '1.25rem',
          right: '1.25rem',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
            letterSpacing: '0.06em',
            color: '#f2ede6',
            margin: 0,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {project}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            color: 'rgba(242,237,230,0.5)',
            margin: '0.4rem 0 0',
            textTransform: 'uppercase',
          }}
        >
          {count} {count === 1 ? 'foto' : 'fotos'}
        </p>
      </div>

      {/* Arrow */}
      <div
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.75rem',
          color: 'rgba(242,237,230,0.5)',
          transform: hovered ? 'translate(3px,-3px)' : 'translate(0,0)',
          transition: 'transform 0.3s ease',
        }}
      >
        →
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Project overlay — all photos in a grid
// ---------------------------------------------------------------------------
function ProjectOverlay({
  project,
  photos,
  onClose,
}: {
  project: string
  photos: PhotoEntry[]
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
      aria-label={project}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f2ede6',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '1.75rem 2.5rem',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          background: '#f2ede6',
          zIndex: 10,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 300,
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink)',
            }}
          >
            {project}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              color: 'var(--color-text-muted)',
              marginLeft: '1.5rem',
              textTransform: 'uppercase',
            }}
          >
            {photos.length} fotos
          </span>
        </div>

        <button
          onClick={onClose}
          data-cursor="link"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'none',
            padding: 0,
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Photo grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px',
          padding: '2px',
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            style={{ position: 'relative', aspectRatio: '4/3' }}
          >
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FotoSection — entry point
// ---------------------------------------------------------------------------
export function FotoSection() {
  const [openProject, setOpenProject] = useState<string | null>(null)
  const projects = getAllProjects()

  const openPhotos = openProject ? getPhotosByProject(openProject) : []

  return (
    <>
      <section
        id="foto"
        style={{
          background: 'var(--color-bg)',
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
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-8)',
            }}
          >
            Fotografía
          </p>

          {/* Project cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '2px',
            }}
          >
            {projects.map((project) => {
              const cover = registry.photos.find(p => p.project === project)
              if (!cover) return null
              return (
                <ProjectCover
                  key={project}
                  project={project}
                  cover={cover}
                  onClick={() => setOpenProject(project)}
                />
              )
            })}
          </div>
        </div>
      </section>

      {openProject && (
        <ProjectOverlay
          project={openProject}
          photos={openPhotos}
          onClose={() => setOpenProject(null)}
        />
      )}
    </>
  )
}
