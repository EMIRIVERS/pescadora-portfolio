'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { registry } from '@/lib/registry'
import type { VideoCategory, VideoEntry } from '@/types/media'
import type { PortfolioCategory } from '@/types/media'
import ProjectOverlay from './ProjectOverlay'

type OverlayMediaType = 'video' | 'fotografia'

interface ProjectCard {
  name: string
  label: string
  coverUrl: string | null
  count: number
  isPhoto: boolean
}

export interface CmsProjectCard {
  id: string
  title: string
  description: string | null
  cover_url: string | null
}

interface Props {
  cmsProjects?: CmsProjectCard[]
  videos?: VideoEntry[]
  categories?: PortfolioCategory[]
}

const FALLBACK_CATEGORIES: PortfolioCategory[] = [
  { slug: 'videoclips',   label: 'Videoclips',   sort_order: 0 },
  { slug: 'corporativos', label: 'Corporativos', sort_order: 1 },
  { slug: 'restaurantes', label: 'Restaurantes', sort_order: 2 },
  { slug: 'comerciales',  label: 'Comerciales',  sort_order: 3 },
  { slug: 'fotografia',   label: 'Fotografía',   sort_order: 4 },
]

function buildAllCards(videos: VideoEntry[], cats: PortfolioCategory[]): ProjectCard[] {
  const videoList = videos.length > 0 ? videos : registry.videos
  const cards: ProjectCard[] = []

  for (const cat of cats) {
    const isPhoto = cat.slug === 'fotografia'

    if (isPhoto) {
      // DB fotografia: vimeoId = image URL
      const dbFotos = videoList.filter((v) => (v.category as string) === 'fotografia')
      if (dbFotos.length > 0) {
        const autoCover = dbFotos[0]?.vimeoId ?? null
        cards.push({ name: cat.slug, label: cat.label, coverUrl: cat.cover_url ?? autoCover, count: dbFotos.length, isPhoto: true })
      } else {
        // Fallback: static registry grouped by project
        const projectMap = new Map<string, string>()
        for (const photo of registry.photos) {
          if (!projectMap.has(photo.project)) projectMap.set(photo.project, photo.url)
        }
        if (projectMap.size > 0) {
          const [, url] = [...projectMap.entries()][0]
          cards.push({ name: cat.slug, label: cat.label, coverUrl: cat.cover_url ?? url, count: projectMap.size, isPhoto: true })
        }
      }
    } else {
      const catVideos = videoList.filter((v) => v.category === cat.slug)
      if (catVideos.length === 0) continue
      const firstVideo = catVideos[0]
      const autoCover = firstVideo
        ? (firstVideo.cover_url ?? (firstVideo.vimeoId ? `/api/vimeo-thumb?id=${firstVideo.vimeoId}` : null))
        : null
      cards.push({
        name: cat.slug,
        label: cat.label,
        coverUrl: cat.cover_url ?? autoCover,
        count: catVideos.length,
        isPhoto: false,
      })
    }
  }

  return cards
}

export default function PortfolioSection({ cmsProjects, videos, categories }: Props) {
  const [openState, setOpenState] = useState<{ project: string; mediaType: OverlayMediaType } | null>(null)

  const activeCats = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES
  const allCards = useMemo(() => buildAllCards(videos ?? [], activeCats), [videos, activeCats])
  const fotoEntries = useMemo(
    () => (videos ?? []).filter((v) => (v.category as string) === 'fotografia'),
    [videos]
  )

  const videoCards = allCards.filter((c) => !c.isPhoto)
  const photoCards = allCards.filter((c) => c.isPhoto)

  function renderCard(card: ReturnType<typeof buildAllCards>[0], index: number) {
    return (
      <motion.div
        key={card.name}
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: index * 0.06,
          },
        }}
        onClick={() => setOpenState({
          project: card.name,
          mediaType: card.name === 'fotografia' ? 'fotografia' : 'video',
        })}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.outline = '1px solid rgba(237,232,224,0.15)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.outline = ''
        }}
        style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
      >
        <div style={{ paddingBottom: card.isPhoto ? '56.25%' : '56.25%', position: 'relative' }}>
          {card.coverUrl ? (
            card.isPhoto ? (
              <Image
                src={card.coverUrl}
                alt={card.name}
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
                style={{ objectFit: 'cover', transition: 'transform 0.7s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.coverUrl}
                alt={card.name}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', transition: 'transform 0.7s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }}
              />
            )
          ) : (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111' }} />
          )}

          {/* Gradient */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.88))',
            pointerEvents: 'none',
          }} />

          {/* Category label */}
          <span style={{
            position: 'absolute', bottom: '1rem', left: '1rem',
            fontSize: 'clamp(1rem, 2vw, 1.6rem)',
            fontWeight: 700, letterSpacing: '0.02em',
            textTransform: 'uppercase', color: '#ede8e0',
            pointerEvents: 'none',
          }}>
            {card.label}
          </span>

          {/* Count */}
          <span style={{
            position: 'absolute', bottom: '1rem', right: '1rem',
            fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem',
            color: '#6b6560', letterSpacing: '0.15em',
            textTransform: 'uppercase', pointerEvents: 'none',
          }}>
            {card.count} {card.name === 'fotografia' ? 'proyectos' : 'videos'}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <section id="portfolio" style={{ padding: '0 0 4rem' }}>

      {/* Label */}
      <div style={{ paddingTop: '5rem', paddingBottom: '2.5rem', paddingLeft: '2rem' }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#6b6560',
        }}>
          <span style={{ color: '#e8341a', marginRight: '0.5rem' }}>──</span>
          Trabajo
        </span>
      </div>

      {/* ── VIDEO CATEGORIES ── */}
      {videoCards.length > 0 && (
        <>
          <div style={{ paddingLeft: '2rem', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.5rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#3a3632',
            }}>
              Audiovisual
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(237,232,224,0.04)' }} />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2px',
          }}>
            {videoCards.map((card, index) => renderCard(card, index))}
          </div>
        </>
      )}

      {/* ── SEPARATOR ── */}
      {videoCards.length > 0 && photoCards.length > 0 && (
        <div style={{ height: '3px', background: '#050505' }} />
      )}

      {/* ── PHOTO CATEGORIES ── */}
      {photoCards.length > 0 && (
        <>
          <div style={{ paddingLeft: '2rem', paddingTop: '0.5rem', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.5rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#3a3632',
            }}>
              Fotografía
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(237,232,224,0.04)' }} />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2px',
          }}>
            {photoCards.map((card, index) => renderCard(card, videoCards.length + index))}
          </div>
        </>
      )}

      {/* Overlay */}
      {openState !== null && (
        <ProjectOverlay
          projectName={openState.project}
          mediaType={openState.mediaType}
          onClose={() => setOpenState(null)}
          videos={videos}
          fotoEntries={fotoEntries.length > 0 ? fotoEntries : undefined}
        />
      )}

      {/* CMS projects */}
      {cmsProjects && cmsProjects.length > 0 && (
        <div style={{ marginTop: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(237,232,224,0.06)' }} />
            <span style={{
              fontFamily: 'var(--font-geist-mono)', fontSize: '0.55rem',
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b6560',
              whiteSpace: 'nowrap',
            }}>
              Proyectos recientes
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(237,232,224,0.06)' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2px',
          }}>
            {cmsProjects.map((project) => (
              <div key={project.id} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ paddingBottom: '75%', position: 'relative' }}>
                  {project.cover_url ? (
                    <Image
                      src={project.cover_url}
                      alt={project.title}
                      fill
                      sizes="(max-width: 800px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111' }} />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.85))',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    position: 'absolute', bottom: '1rem', left: '1rem',
                    fontSize: 'clamp(1rem, 2vw, 1.6rem)', fontWeight: 700,
                    letterSpacing: '0.02em', textTransform: 'uppercase',
                    color: '#ede8e0', pointerEvents: 'none',
                  }}>
                    {project.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
