import { createServiceClient } from '@/lib/supabase/server'
import VideoManager from '@/components/admin/portfolio/VideoManager'
import CategoryManager from '@/components/admin/portfolio/CategoryManager'
import PhotoManager, { type Album } from '@/components/admin/portfolio/PhotoManager'

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

const STAT_CATEGORIES = [
  { key: 'videoclips',   label: 'Videoclips' },
  { key: 'corporativos', label: 'Corporativos' },
  { key: 'restaurantes', label: 'Restaurantes' },
  { key: 'comerciales',  label: 'Comerciales' },
  { key: 'fotografia',   label: 'Fotografía' },
] as const

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

// Accent colours per category (subtle tint for the card border / count)
const CATEGORY_ACCENT: Record<string, string> = {
  videoclips:   '#BF5AF2',
  corporativos: '#0A84FF',
  restaurantes: '#FF9F0A',
  comerciales:  '#30D158',
  fotografia:   '#FF453A',
  visibles:     '#30D158',
  ocultos:      '#FF453A',
}

interface StatCardProps {
  label: string
  count: number
  categoryKey: string
}

function StatCard({ label, count, categoryKey }: StatCardProps) {
  const accent = CATEGORY_ACCENT[categoryKey] ?? 'var(--dash-text-secondary)'
  return (
    <div
      style={{
        flex: '1 1 120px',
        backgroundColor: 'var(--dash-surface-2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
          color: 'var(--dash-text-primary)',
          lineHeight: 1,
          fontFamily: FONT,
          letterSpacing: '-0.02em',
        }}
      >
        {count}
      </p>
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
      .select('*, portfolio_photos(*)')
      .order('sort_order', { ascending: true }),
  ])

  const allVideos: PortfolioVideo[] = (videos ?? []) as PortfolioVideo[]
  const allCategories: PortfolioCategory[] = (categoriesData ?? []) as PortfolioCategory[]
  const allAlbums: Album[] = (albumsData ?? []) as Album[]

  const categoryCounts = STAT_CATEGORIES.reduce<Record<string, number>>(
    (acc, { key }) => {
      acc[key] = allVideos.filter((v) => v.category === key).length
      return acc
    },
    {},
  )

  // Full count per slug — includes any slugs not in the static STAT_CATEGORIES list
  const videoCountsBySlug = allVideos.reduce<Record<string, number>>((acc, v) => {
    if (v.category) acc[v.category] = (acc[v.category] ?? 0) + 1
    return acc
  }, {})

  const visibleCount = allVideos.filter((v) => v.is_visible).length
  const hiddenCount  = allVideos.length - visibleCount


  return (
    <div
      style={{
        padding: '40px 32px',
        fontFamily: FONT,
        minHeight: '100vh',
        backgroundColor: 'var(--dash-surface-1)',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
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
          Gestion de videos y contenido
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <StatCard
          label="Total"
          count={allVideos.length}
          categoryKey="total"
        />
        {STAT_CATEGORIES.map(({ key, label }) => (
          <StatCard key={key} label={label} count={categoryCounts[key] ?? 0} categoryKey={key} />
        ))}
        <StatCard label="Visibles" count={visibleCount} categoryKey="visibles" />
        <StatCard label="Ocultos"  count={hiddenCount}  categoryKey="ocultos" />
      </div>

      {/* ── Category manager ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <CategoryManager initialCategories={allCategories} videoCounts={videoCountsBySlug} />
      </div>

      {/* ── Video manager ─────────────────────────────────────────────────── */}
      <VideoManager initialVideos={allVideos} />

      {/* ── Fotografías ───────────────────────────────────────────────────── */}
      <div style={{ marginTop: 48 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--dash-text-primary)',
                fontFamily: FONT,
                letterSpacing: '-0.01em',
              }}
            >
              Fotografias
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
              Albums almacenados en la plataforma — arrastra para reordenar fotos dentro de cada album
            </p>
          </div>
        </div>
        <PhotoManager initialAlbums={allAlbums} />
      </div>
    </div>
  )
}
