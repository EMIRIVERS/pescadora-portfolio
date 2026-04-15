'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { registry } from '@/lib/registry'
import type { VideoCategory, VideoEntry } from '@/types/media'
import ProjectOverlay from './ProjectOverlay'

type FilterMode = 'foto' | 'video'

interface ProjectCard {
  name: string
  coverUrl: string | null
  count: number
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

function groupPhotosByProject(): ProjectCard[] {
  const projectMap = new Map<string, { urls: string[]; count: number }>()
  for (const photo of registry.photos) {
    const existing = projectMap.get(photo.project)
    if (existing) {
      existing.count++
    } else {
      projectMap.set(photo.project, { urls: [photo.url], count: 1 })
    }
  }
  const cards: ProjectCard[] = []
  for (const [name, data] of projectMap) {
    cards.push({ name, coverUrl: data.urls[0] ?? null, count: data.count })
  }
  return cards
}

const CATEGORY_LABELS: Record<VideoCategory, string> = {
  'comercial':  'Comercial',
  'video-clip': 'Video Clip',
  'entrevista': 'Entrevista',
  'podcast':    'Podcast',
}

function groupVideosByCategory(source?: VideoEntry[]): ProjectCard[] {
  const videoList = source && source.length > 0 ? source : registry.videos
  const categoryMap = new Map<VideoCategory, { count: number; firstVimeoId?: string }>()
  for (const video of videoList) {
    const existing = categoryMap.get(video.category)
    if (existing) {
      existing.count++
    } else {
      categoryMap.set(video.category, { count: 1, firstVimeoId: video.vimeoId })
    }
  }
  const cards: ProjectCard[] = []
  for (const [category, data] of categoryMap) {
    cards.push({
      name: category,
      coverUrl: data.firstVimeoId ? `/api/vimeo-thumb?id=${data.firstVimeoId}` : null,
      count: data.count,
    })
  }
  return cards
}

export default function PortfolioSection({ cmsProjects, videos }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('video')
  const [openProject, setOpenProject] = useState<string | null>(null)

  const fotoCards = useMemo(() => groupPhotosByProject(), [])
  const videoCards = useMemo(() => groupVideosByCategory(videos), [videos])
  const cards = activeFilter === 'foto' ? fotoCards : videoCards

  const aspectPadding = activeFilter === 'foto' ? '75%' : '56.25%'

  return (
    <section id="portfolio" style={{ padding: '6rem 2rem 3rem' }}>
      {/* FOTO / VIDEO Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 0 }}>
        <span
          onClick={() => setActiveFilter('foto')}
          style={{
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            fontWeight: 700,
            fontFamily: 'var(--font-geist-sans)',
            color: activeFilter === 'foto' ? '#f2ede6' : 'rgba(242,237,230,0.12)',
            transition: 'color 0.6s ease',
            cursor: 'none',
            userSelect: 'none',
          }}
        >
          FOTO
        </span>
        <span
          style={{
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            fontWeight: 700,
            fontFamily: 'var(--font-geist-sans)',
            color: '#8a8078',
            userSelect: 'none',
          }}
        >
          {' / '}
        </span>
        <span
          onClick={() => setActiveFilter('video')}
          style={{
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            fontWeight: 700,
            fontFamily: 'var(--font-geist-sans)',
            color: activeFilter === 'video' ? '#f2ede6' : 'rgba(242,237,230,0.12)',
            transition: 'color 0.6s ease',
            cursor: 'none',
            userSelect: 'none',
          }}
        >
          VIDEO
        </span>
      </div>

      {/* Project Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2px',
          marginTop: '2rem',
        }}
      >
        <AnimatePresence mode="sync">
          {cards.map((card, index) => (
            <motion.div
              key={`${activeFilter}-${card.name}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: index * 0.05,
                },
              }}
              exit={{
                opacity: 0,
                y: -12,
                transition: { duration: 0.25 },
              }}
              onClick={() => setOpenProject(card.name)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                cursor: 'none',
              }}
            >
              {/* Aspect ratio box */}
              <div style={{ paddingBottom: aspectPadding, position: 'relative' }}>
                {card.coverUrl ? (
                  activeFilter === 'video' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.coverUrl}
                      alt={card.name}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.7s ease',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'
                      }}
                    />
                  ) : (
                    <Image
                      src={card.coverUrl}
                      alt={card.name}
                      fill
                      sizes="(max-width: 800px) 100vw, 50vw"
                      style={{
                        objectFit: 'cover',
                        transition: 'transform 0.7s ease',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: '#1a1816',
                      transition: 'transform 0.7s ease',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
                    }}
                  />
                )}

                {/* Gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))',
                    pointerEvents: 'none',
                  }}
                />

                {/* Project name */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
                    fontWeight: 600,
                    color: '#f2ede6',
                    pointerEvents: 'none',
                  }}
                >
                  {activeFilter === 'video'
                    ? CATEGORY_LABELS[card.name as VideoCategory] ?? card.name
                    : card.name}
                </span>

                {/* Count */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    right: '1rem',
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.7rem',
                    color: '#8a8078',
                    pointerEvents: 'none',
                  }}
                >
                  {card.count} {activeFilter === 'foto' ? 'fotos' : 'videos'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Project Overlay */}
      {openProject !== null && (
        <ProjectOverlay
          projectName={openProject}
          mediaType={activeFilter}
          onClose={() => setOpenProject(null)}
          videos={videos}
        />
      )}

      {/* CMS projects — only rendered when the admin has published at least one */}
      {cmsProjects && cmsProjects.length > 0 && (
        <div style={{ marginTop: '5rem' }}>
          {/* Separator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'rgba(242,237,230,0.08)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#8a8078',
                whiteSpace: 'nowrap',
              }}
            >
              Proyectos recientes
            </span>
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'rgba(242,237,230,0.08)',
              }}
            />
          </div>

          {/* CMS project grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '2px',
            }}
          >
            {cmsProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'default',
                }}
              >
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
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#1a1816',
                      }}
                    />
                  )}

                  {/* Gradient overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Project title */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '1rem',
                      left: '1rem',
                      fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
                      fontWeight: 600,
                      color: '#f2ede6',
                      pointerEvents: 'none',
                    }}
                  >
                    {project.title}
                  </span>

                  {/* Description */}
                  {project.description && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '3rem',
                        left: '1rem',
                        right: '1rem',
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.65rem',
                        color: 'rgba(242,237,230,0.55)',
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {project.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
