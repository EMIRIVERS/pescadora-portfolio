'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { registry } from '@/lib/registry'
import type { VideoEntry } from '@/types/media'
import type { PortfolioCategory } from '@/types/media'
import type { PhotoAlbum } from '@/types/media'
import ProjectOverlay from './ProjectOverlay'

type OverlayMediaType = 'video' | 'fotografia'

interface ProjectCard {
  name: string
  label: string
  coverUrl: string | null
  count: number
  isPhoto: boolean
  previewVimeoId: string | null
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
  photoAlbums?: PhotoAlbum[]
}

interface OverlayOrigin {
  x: number
  y: number
  w: number
  h: number
}

const FALLBACK_CATEGORIES: PortfolioCategory[] = [
  { slug: 'videoclips',   label: 'Videoclips',   sort_order: 0 },
  { slug: 'corporativos', label: 'Corporativos', sort_order: 1 },
  { slug: 'restaurantes', label: 'Restaurantes', sort_order: 2 },
  { slug: 'comerciales',  label: 'Comerciales',  sort_order: 3 },
  { slug: 'fotografia',   label: 'Fotografía',   sort_order: 4 },
]

const VIMEO_BG_PARAMS = 'autoplay=1&muted=1&background=1&loop=1&title=0&byline=0&portrait=0'

function buildAllCards(videos: VideoEntry[], cats: PortfolioCategory[]): ProjectCard[] {
  const videoList = videos.length > 0 ? videos : registry.videos
  const cards: ProjectCard[] = []

  for (const cat of cats) {
    const isPhoto = cat.slug === 'fotografia'

    if (isPhoto) {
      const dbFotos = videoList.filter((v) => (v.category as string) === 'fotografia')
      if (dbFotos.length > 0) {
        const autoCover = dbFotos[0]?.vimeoId ?? null
        cards.push({ name: cat.slug, label: cat.label, coverUrl: cat.cover_url ?? autoCover, count: dbFotos.length, isPhoto: true, previewVimeoId: null })
      } else {
        const projectMap = new Map<string, string>()
        for (const photo of registry.photos) {
          if (!projectMap.has(photo.project)) projectMap.set(photo.project, photo.url)
        }
        if (projectMap.size > 0) {
          const [, url] = [...projectMap.entries()][0]
          cards.push({ name: cat.slug, label: cat.label, coverUrl: cat.cover_url ?? url, count: projectMap.size, isPhoto: true, previewVimeoId: null })
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
        previewVimeoId: firstVideo?.vimeoId ?? null,
      })
    }
  }

  return cards
}

/* ─── Frozen GIF: muestra primer frame estático, reproduce solo en hover ─── */
function FrozenGif({ src, alt, hovered }: { src: string; alt: string; hovered: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frozen, setFrozen] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        setFrozen(true)
      }
    }
    img.src = src
  }, [src])

  return (
    <>
      {/* Canvas con primer frame congelado */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* GIF real, solo visible en hover */}
      {(hovered || !frozen) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: hovered ? 1 : (frozen ? 0 : 1),
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </>
  )
}

function isGif(url: string): boolean {
  return /\.gif(\?|$)/i.test(url)
}

/* ─── Card con hover preview ─── */
function PortfolioCard({
  card,
  index,
  isBanner,
  onOpen,
}: {
  card: ProjectCard
  index: number
  isBanner?: boolean
  onOpen: (card: ProjectCard, origin: OverlayOrigin) => void
}) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const aspect = isBanner ? '38%' : '56.25%'

  const handleClick = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    onOpen(card, { x: rect.left, y: rect.top, w: rect.width, h: rect.height })
  }, [card, onOpen])

  return (
    <motion.div
      ref={ref}
      id={card.name}
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.06 },
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        ...(isBanner ? { gridColumn: '1 / -1' } : {}),
      }}
    >
      <div style={{ paddingBottom: aspect, position: 'relative', background: '#111' }}>
        {/* Imagen estática de portada */}
        {card.coverUrl && (
          isGif(card.coverUrl) ? (
            <FrozenGif src={card.coverUrl} alt={card.name} hovered={hovered} />
          ) : card.isPhoto ? (
            <Image
              src={card.coverUrl}
              alt={card.name}
              fill
              sizes={isBanner ? '100vw' : '(max-width: 800px) 100vw, 50vw'}
              style={{
                objectFit: 'cover',
                transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.5s ease',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                filter: hovered ? 'brightness(1.1)' : 'brightness(1)',
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.coverUrl}
              alt={card.name}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                opacity: hovered && card.previewVimeoId ? 0 : 1,
              }}
            />
          )
        )}
        {!card.coverUrl && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111' }} />
        )}

        {/* Vimeo preview on hover (solo video cards) */}
        {hovered && card.previewVimeoId && (
          <iframe
            src={`https://player.vimeo.com/video/${card.previewVimeoId}?${VIMEO_BG_PARAMS}`}
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: 'absolute',
              inset: '-5%',
              width: '110%',
              height: '110%',
              border: 'none',
              pointerEvents: 'none',
              zIndex: 1,
            }}
            allow="autoplay"
            title={card.label}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: hovered
            ? 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))'
            : 'linear-gradient(transparent 20%, rgba(0,0,0,0.85))',
          transition: 'background 0.5s ease',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* Category label */}
        <span style={{
          position: 'absolute', bottom: '1rem', left: '1.2rem',
          fontSize: isBanner ? 'clamp(1.1rem, 2.5vw, 1.8rem)' : 'clamp(0.9rem, 1.8vw, 1.4rem)',
          fontWeight: 700, letterSpacing: '0.02em',
          textTransform: 'uppercase', color: '#ede8e0',
          pointerEvents: 'none', zIndex: 3,
          transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        }}>
          {card.label}
        </span>

        {/* Count */}
        <span style={{
          position: 'absolute', bottom: '1rem', right: '1.2rem',
          fontFamily: 'var(--font-geist-mono)', fontSize: '0.6rem',
          color: '#6b6560', letterSpacing: '0.15em',
          textTransform: 'uppercase', pointerEvents: 'none', zIndex: 3,
          transition: 'opacity 0.4s ease',
          opacity: hovered ? 1 : 0.6,
        }}>
          {card.count} {card.name === 'fotografia' ? 'proyectos' : 'videos'}
        </span>

        {/* Hover line accent */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: hovered ? '100%' : '0%',
          height: '2px',
          background: '#e8341a',
          transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          zIndex: 4,
        }} />
      </div>
    </motion.div>
  )
}

export default function PortfolioSection({ cmsProjects, videos, categories, photoAlbums }: Props) {
  const [openState, setOpenState] = useState<{ project: string; mediaType: OverlayMediaType; origin: OverlayOrigin } | null>(null)

  const activeCats = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES
  const allCards = useMemo(() => buildAllCards(videos ?? [], activeCats), [videos, activeCats])
  const fotoEntries = useMemo(
    () => (videos ?? []).filter((v) => (v.category as string) === 'fotografia'),
    [videos]
  )

  const videoCards = allCards.filter((c) => !c.isPhoto)
  const photoCards = allCards.filter((c) => c.isPhoto)

  const handleOpen = useCallback((card: ProjectCard, origin: OverlayOrigin) => {
    setOpenState({
      project: card.name,
      mediaType: card.name === 'fotografia' ? 'fotografia' : 'video',
      origin,
    })
  }, [])

  return (
    <section id="portfolio" style={{ padding: '0 0 clamp(2rem, 4vw, 4rem)' }}>

      {/* Label */}
      <div style={{ paddingTop: 'clamp(3rem, 5vw, 5rem)', paddingBottom: 'clamp(1.5rem, 3vw, 2.5rem)', paddingLeft: 'clamp(1.2rem, 4vw, 2rem)' }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.7rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#6b6560',
        }}>
          <span style={{ color: '#e8341a', marginRight: '0.5rem' }}>──</span>
          Trabajo
        </span>
      </div>

      {/* Grid unificado */}
      <style>{`
        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(4px, 1vw, 12px);
        }
        @media (max-width: 680px) {
          .portfolio-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="portfolio-grid">
        {videoCards.map((card, index) => (
          <PortfolioCard key={card.name} card={card} index={index} onOpen={handleOpen} />
        ))}
        {photoCards.map((card, index) => (
          <PortfolioCard key={card.name} card={card} index={videoCards.length + index} isBanner onOpen={handleOpen} />
        ))}
      </div>

      {/* Overlay */}
      {openState !== null && (
        <ProjectOverlay
          projectName={openState.project}
          mediaType={openState.mediaType}
          origin={openState.origin}
          onClose={() => setOpenState(null)}
          videos={videos}
          fotoEntries={fotoEntries.length > 0 ? fotoEntries : undefined}
          photoAlbums={photoAlbums}
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

          <div className="portfolio-grid">
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
