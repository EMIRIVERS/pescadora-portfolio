'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { registry } from '@/lib/registry'
import { projectStories } from '@/data/project-stories'
import { resolveMediaSrc } from '@/lib/media'
import MediaTile from '@/components/portfolio/MediaTile'
import type { PhotoEntry } from '@/types/media'
import type { PhotoAlbum } from '@/types/media'
import { useIsMobileOverlay } from './lib'
import { InfoCell } from './InfoCell'

// ── DB albums (Supabase photo_albums) ───────────────────────────────────────
export function DbAlbumsGrid({ albums, onSelect }: { albums: PhotoAlbum[]; onSelect: (album: PhotoAlbum) => void }) {
  const isMobile = useIsMobileOverlay()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2, padding: '0 0 4rem' }}>
      {albums.map((album, i) => (
        <MediaTile
          key={album.id}
          src={resolveMediaSrc(album.cover_url ?? album.photos[0]?.storage_path)}
          alt={album.label}
          label={album.label}
          meta={`${album.photos.length} fotos`}
          onActivate={() => onSelect(album)}
          ariaLabel={`Abrir álbum: ${album.label} — ${album.photos.length} fotos`}
          entrance="fade-up-30"
          index={i}
        />
      ))}
    </div>
  )
}

export function DbAlbumDetail({ album, onBack, onClose }: { album: PhotoAlbum; onBack: () => void; onClose: () => void }) {
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
          <MediaTile
            key={photo.id}
            src={resolveMediaSrc(photo.storage_path)}
            alt={photo.alt_text || album.label}
            entrance="fade-up-20"
            index={i}
            gradient="none"
          />
        ))}
      </div>
    </motion.div>
  )
}

// ── Static registry fallback ────────────────────────────────────────────────
export function PhotoProjectsGrid({ onSelect }: { onSelect: (project: string) => void }) {
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
        <MediaTile
          key={name}
          src={data.url}
          alt={name}
          label={name}
          meta={`${data.count} fotos`}
          onActivate={() => onSelect(name)}
          ariaLabel={`Abrir proyecto: ${name} — ${data.count} fotos`}
          entrance="fade-up-30"
          index={i}
        />
      ))}
    </div>
  )
}

export function PhotoProjectDetail({ projectName, onBack, onClose }: { projectName: string; onBack: () => void; onClose: () => void }) {
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
          <MediaTile
            key={photo.id}
            src={photo.url}
            alt={photo.alt}
            entrance="none"
            gradient="none"
            eager={i < 2}
          />
        ))}
      </div>
    </motion.div>
  )
}
