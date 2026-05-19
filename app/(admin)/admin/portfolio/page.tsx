import { createServiceClient } from '@/lib/supabase/server'
import PortfolioTabs from '@/components/admin/portfolio/PortfolioTabs'
import type { Album } from '@/components/admin/portfolio/PhotoManager'

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

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const STAT_CATEGORIES = [
  { key: 'videoclips',   label: 'Videoclips' },
  { key: 'corporativos', label: 'Corporativos' },
  { key: 'restaurantes', label: 'Restaurantes' },
  { key: 'comerciales',  label: 'Comerciales' },
] as const

const CATEGORY_ACCENT: Record<string, string> = {
  videoclips:   '#BF5AF2',
  corporativos: '#0A84FF',
  restaurantes: '#FF9F0A',
  comerciales:  '#30D158',
  visibles:     '#30D158',
  ocultos:      '#FF453A',
  fotografia:   '#e8341a',
}

interface StatCardProps {
  label: string
  count: number
  categoryKey: string
  sub?: string
}

function StatCard({ label, count, categoryKey, sub }: StatCardProps) {
  const accent = CATEGORY_ACCENT[categoryKey] ?? 'var(--dash-text-secondary)'
  return (
    <div
      style={{
        flex: '1 1 120px',
        backgroundColor: 'var(--dash-surface-2)',
        border: `1px solid ${categoryKey === 'fotografia' ? 'rgba(232,52,26,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: FONT,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: accent,
          flexShrink: 0,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--dash-text-secondary)',
          fontFamily: FONT,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 600,
          color: categoryKey === 'fotografia' ? '#e8341a' : 'var(--dash-text-primary)',
          lineHeight: 1,
          fontFamily: FONT,
          letterSpacing: '-0.02em',
        }}
      >
        {count}
      </p>
      {sub && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--dash-text-tertiary)' }}>{sub}</p>
      )}
    </div>
  )
}

interface PortfolioCategory {
  id: string
  slug: string
  label: string
  sort_order: number
  is_visible: boolean
  cover_url?: string | null
}

export default async function PortfolioAdminPage() {
  const supabase = createServiceClient()

  const [{ data: videos }, { data: categoriesData }, { data: albumsData }] = await Promise.all([
    supabase.from('portfolio_videos').select('*').order('sort_order', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('portfolio_categories').select('*').order('sort_order', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('photo_albums')
      .select('id, slug, label, sort_order, is_visible, parent_id, cover_url, portfolio_photos(*)')
      .order('sort_order', { ascending: true }),
  ])

  const allVideos: PortfolioVideo[] = (videos ?? []) as PortfolioVideo[]
  const allCategories: PortfolioCategory[] = (categoriesData ?? []) as PortfolioCategory[]
  const allAlbums: Album[] = (albumsData ?? []) as Album[]

  const rootAlbums = allAlbums.filter((a) => !a.parent_id)
  const totalPhotos = allAlbums.reduce((sum, a) => sum + (a.portfolio_photos?.length ?? 0), 0)

  const categoryCounts = STAT_CATEGORIES.reduce<Record<string, number>>(
    (acc, { key }) => {
      acc[key] = allVideos.filter((v) => v.category === key).length
      return acc
    },
    {},
  )

  const videoCountsBySlug = allVideos.reduce<Record<string, number>>((acc, v) => {
    if (v.category) acc[v.category] = (acc[v.category] ?? 0) + 1
    return acc
  }, {})

  const visibleCount = allVideos.filter((v) => v.is_visible).length
  const hiddenCount = allVideos.length - visibleCount

  return (
    <div
      style={{
        padding: '40px 32px',
        fontFamily: FONT,
        minHeight: '100vh',
        backgroundColor: 'var(--dash-bg)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--dash-text-primary)',
            fontFamily: FONT,
            letterSpacing: '-0.02em',
          }}
        >
          Portafolio
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 14,
            color: 'var(--dash-text-secondary)',
            fontFamily: FONT,
          }}
        >
          Gestión de videos, fotografía y categorías
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <StatCard label="Videos" count={allVideos.length} categoryKey="total" />
        {STAT_CATEGORIES.map(({ key, label }) => (
          <StatCard key={key} label={label} count={categoryCounts[key] ?? 0} categoryKey={key} />
        ))}
        <StatCard label="Visibles" count={visibleCount} categoryKey="visibles" />
        <StatCard label="Ocultos"  count={hiddenCount}  categoryKey="ocultos" />
        <StatCard
          label="Fotografía"
          count={rootAlbums.length}
          categoryKey="fotografia"
          sub={`${totalPhotos} foto${totalPhotos !== 1 ? 's' : ''} en total`}
        />
      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 1,
          background: 'var(--dash-border)',
          marginBottom: 28,
        }}
      />

      {/* ── Tabs: Videos | Fotografía | Categorías ─────────────────────────── */}
      <PortfolioTabs
        videos={allVideos}
        categories={allCategories}
        albums={allAlbums}
        videoCounts={videoCountsBySlug}
      />
    </div>
  )
}
