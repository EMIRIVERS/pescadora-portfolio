'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { registry } from '@/lib/registry'
import type { VideoCategory, VideoEntry } from '@/types/media'
import ProjectOverlay from './ProjectOverlay'

type OverlayMediaType = 'video' | 'fotografia'

interface ProjectCard {
  name: string
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
}

const VIDEO_CATEGORIES: VideoCategory[] = ['videoclips', 'corporativos', 'restaurantes', 'comerciales']

const CATEGORY_LABELS: Record<string, string> = {
  'videoclips':   'Videoclips',
  'corporativos': 'Corporativos',
  'restaurantes': 'Restaurantes',
  'comerciales':  'Comerciales',
  'fotografia':   'Fotografía',
}

function groupPhotosByProject(): ProjectCard[] {
  const projectMap = new Map<string, { url: string; count: number }>()
  for (const photo of registry.photos) {
    const existing = projectMap.get(photo.project)
    if (existing) {
      existing.count++
    } else {
      projectMap.set(photo.project, { url: photo.url, count: 1 })
    }
  }
  const cards: ProjectCard[] = []
  for (const [name, data] of projectMap) {
    cards.push({ name, coverUrl: data.url, count: data.count, isPhoto: true })
  }
  return cards
}

function buildAllCards(videos?: VideoEntry[]): ProjectCard[] {
  const videoList = videos && videos.length > 0 ? videos : registry.videos
  const cards: ProjectCard[] = []

  for (const cat of VIDEO_CATEGORIES) {
    const catVideos = videoList.filter((v) => v.category === cat)
    if (catVideos.length === 0) continue
    cards.push({
      name: cat,
      coverUrl: catVideos[0]?.vimeoId ? `/api/vimeo-thumb?id=${catVideos[0].vimeoId}` : null,
      count: catVideos.length,
      isPhoto: false,
    })
  }

  // Fotografía al final
  const photoProjects = groupPhotosByProject()
  if (photoProjects.length > 0) {
    cards.push({
      name: 'fotografia',
      coverUrl: photoProjects[0].coverUrl,
      count: photoProjects.length,
      isPhoto: true,
    })
  }

  return cards
}

export default function PortfolioSection({ cmsProjects, videos }: Props) {
  const [openState, setOpenState] = useState<{ project: string; mediaType: OverlayMediaType } | null>(null)

  const allCards = useMemo(() => buildAllCards(videos), [videos])

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

      {/* Unified category grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2px',
      }}>
        {allCards.map((card, index) => (
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
            <div style={{ paddingBottom: card.isPhoto ? '75%' : '56.25%', position: 'relative' }}>
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
                {CATEGORY_LABELS[card.name] ?? card.name}
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
        ))}
      </div>

      {/* Overlay */}
      {openState !== null && (
        <ProjectOverlay
          projectName={openState.project}
          mediaType={openState.mediaType}
          onClose={() => setOpenState(null)}
          videos={videos}
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
