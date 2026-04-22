'use client'
import { useState } from 'react'
import { registry } from '@/lib/registry'
import type { VideoEntry, VideoCategory } from '@/types/media'

const CATEGORY_LABELS: Record<VideoCategory, string> = {
  'videoclips':   'Videoclips',
  'corporativos': 'Corporativos',
  'restaurantes': 'Restaurantes',
  'comerciales':  'Comerciales',
}

const CATEGORY_ORDER: VideoCategory[] = ['videoclips', 'corporativos', 'restaurantes', 'comerciales']

const VIMEO_PARAMS = 'title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'

// ---------------------------------------------------------------------------
// VideoTile
// ---------------------------------------------------------------------------
function VideoTile({ video }: { video: VideoEntry }) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen]       = useState(false)

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#111',
        }}
      >
        {/* Thumbnail estático de Vimeo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/vimeo-thumb?id=${video.vimeoId}`}
          alt={video.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Preview en hover — muted, sin controles */}
        {hovered && (
          <iframe
            src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&muted=1&background=1&loop=1&${VIMEO_PARAMS}`}
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: 'absolute',
              inset: '-5%',
              width: '110%',
              height: '110%',
              border: 'none',
              pointerEvents: 'none',
            }}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            title={video.title}
          />
        )}

        {/* Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: hovered ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)',
          transition: 'background 0.4s',
          zIndex: 1,
        }} />

        {/* Play */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
          zIndex: 2,
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '1px solid color-mix(in srgb, var(--color-text) 70%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: 'var(--color-text)', fontSize: '1rem', marginLeft: 4 }}>▶</span>
          </div>
        </div>

        {/* Título */}
        <div style={{
          position: 'absolute',
          bottom: '0.85rem',
          left: '1rem',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.6rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text)',
          opacity: hovered ? 1 : 0.55,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
          zIndex: 3,
        }}>
          {video.title}
        </div>
      </div>

      {/* Modal fullscreen */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.97)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '90vw', maxWidth: 1100, aspectRatio: '16/9' }}
          >
            <iframe
              src={`https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&${VIMEO_PARAMS}`}
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              allowFullScreen
              title={video.title}
            />
          </div>

          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '2rem',
              background: 'none',
              border: 'none',
              color: 'rgba(242,237,230,0.5)',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ← Cerrar
          </button>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// VideoSection
// ---------------------------------------------------------------------------
export function VideoSection() {
  const grouped = CATEGORY_ORDER.reduce<Record<VideoCategory, VideoEntry[]>>(
    (acc, cat) => {
      acc[cat] = registry.videos.filter((v) => v.category === cat)
      return acc
    },
    { videoclips: [], corporativos: [], restaurantes: [], comerciales: [] }
  )

  const activeCategories = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)

  return (
    <section
      id="video"
      style={{
        background: 'var(--color-video-bg)',
        padding: 'var(--space-16) var(--space-4)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(242,237,230,0.35)',
          marginBottom: 'var(--space-12)',
        }}>
          Video
        </p>

        {activeCategories.map((cat) => (
          <div key={cat} style={{ marginBottom: 'var(--space-12)' }}>
            <h3 style={{
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 200,
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
              letterSpacing: '0.08em',
              color: 'var(--color-text)',
              margin: '0 0 1px',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
              {CATEGORY_LABELS[cat]}
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1px',
              marginTop: '1px',
            }}>
              {grouped[cat].map((video) => (
                <VideoTile key={video.id} video={video} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
