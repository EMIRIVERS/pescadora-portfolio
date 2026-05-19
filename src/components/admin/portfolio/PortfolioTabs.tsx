'use client'

import { useState } from 'react'
import VideoManager from './VideoManager'
import PhotoManager, { type Album } from './PhotoManager'
import CategoryManager from './CategoryManager'

interface PortfolioVideo {
  id: string
  title: string
  vimeo_id: string
  category: string
  client_name: string
  year: string
  role: string
  description: string
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

interface PortfolioCategory {
  id: string
  slug: string
  label: string
  sort_order: number
  is_visible: boolean
  cover_url?: string | null
}

interface Props {
  videos: PortfolioVideo[]
  categories: PortfolioCategory[]
  albums: Album[]
  videoCounts: Record<string, number>
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const TABS = [
  { key: 'videos',     label: 'Videos' },
  { key: 'fotografia', label: 'Fotografía' },
  { key: 'categorias', label: 'Categorías' },
] as const

type TabKey = typeof TABS[number]['key']

export default function PortfolioTabs({ videos, categories, albums, videoCounts }: Props) {
  const [tab, setTab] = useState<TabKey>('videos')

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 28,
          background: 'var(--dash-surface-2)',
          border: '1px solid var(--dash-border)',
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key
          const isFoto = t.key === 'fotografia'
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                border: 'none',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                fontFamily: FONT,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                background: active
                  ? isFoto
                    ? 'rgba(232,52,26,0.15)'
                    : 'var(--dash-surface-3)'
                  : 'transparent',
                color: active
                  ? isFoto
                    ? '#e8341a'
                    : 'var(--dash-text-primary)'
                  : 'var(--dash-text-secondary)',
                letterSpacing: active ? '-0.01em' : '0',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panels */}
      {tab === 'videos' && (
        <VideoManager initialVideos={videos} />
      )}

      {tab === 'fotografia' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#e8341a',
              }}
            >
              Álbumes de fotografía
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)' }}>
              Arrastra para reordenar — el orden se refleja en el sitio público
            </p>
          </div>
          <PhotoManager initialAlbums={albums} />
        </div>
      )}

      {tab === 'categorias' && (
        <CategoryManager
          initialCategories={categories}
          videoCounts={videoCounts}
        />
      )}
    </div>
  )
}
