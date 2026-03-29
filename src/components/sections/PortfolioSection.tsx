'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import { registry } from '@/lib/registry'
import type { VideoCategory } from '@/types/media'
import ProjectOverlay from './ProjectOverlay'

type FilterMode = 'foto' | 'video'

interface ProjectCard {
  name: string
  coverUrl: string | null
  count: number
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

function groupVideosByCategory(): ProjectCard[] {
  const categoryMap = new Map<VideoCategory, number>()
  for (const video of registry.videos) {
    categoryMap.set(video.category, (categoryMap.get(video.category) ?? 0) + 1)
  }
  const cards: ProjectCard[] = []
  for (const [category, count] of categoryMap) {
    cards.push({ name: category, coverUrl: null, count })
  }
  return cards
}

export default function PortfolioSection() {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('foto')
  const [openProject, setOpenProject] = useState<string | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const fotoCards = useMemo(() => groupPhotosByProject(), [])
  const videoCards = useMemo(() => groupVideosByCategory(), [])
  const cards = activeFilter === 'foto' ? fotoCards : videoCards

  useEffect(() => {
    setAnimKey((prev) => prev + 1)
  }, [activeFilter])

  useEffect(() => {
    const elements = cardRefs.current
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      if (!el) continue
      el.style.opacity = '0'
      el.style.transform = 'translateY(20px)'
      const delay = i * 80
      const timeout = setTimeout(() => {
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }, delay)
      // store timeout id for cleanup
      el.dataset.timeout = String(timeout)
    }
    return () => {
      for (const el of elements) {
        if (el?.dataset.timeout) {
          clearTimeout(Number(el.dataset.timeout))
        }
      }
    }
  }, [animKey, cards.length])

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
        {cards.map((card, index) => (
          <div
            key={`${activeFilter}-${card.name}`}
            ref={(el) => {
              cardRefs.current[index] = el
            }}
            onClick={() => setOpenProject(card.name)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              cursor: 'none',
              opacity: 0,
              transform: 'translateY(20px)',
            }}
          >
            {/* Aspect ratio box */}
            <div style={{ paddingBottom: aspectPadding, position: 'relative' }}>
              {card.coverUrl ? (
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
                {card.name}
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
          </div>
        ))}
      </div>

      {/* Project Overlay */}
      {openProject !== null && (
        <ProjectOverlay
          projectName={openProject}
          mediaType={activeFilter}
          onClose={() => setOpenProject(null)}
        />
      )}
    </section>
  )
}
