import { createServiceClient } from '@/lib/supabase/server'
import VideoManager from '@/components/admin/portfolio/VideoManager'

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
  { key: 'videoclips', label: 'Videoclips' },
  { key: 'corporativos', label: 'Corporativos' },
  { key: 'restaurantes', label: 'Restaurantes' },
  { key: 'comerciales', label: 'Comerciales' },
] as const

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#0d0d0d',
        border: '1px solid #1a1a1a',
        padding: '0.75rem 1rem',
        borderRadius: 2,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#555',
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '1.5rem',
          color: '#e8e8e8',
          marginTop: '0.25rem',
          marginBottom: 0,
        }}
      >
        {count}
      </p>
    </div>
  )
}

export default async function PortfolioAdminPage() {
  const supabase = createServiceClient()

  const { data: videos } = await supabase
    .from('portfolio_videos')
    .select('*')
    .order('sort_order', { ascending: true })

  const allVideos: PortfolioVideo[] = (videos ?? []) as PortfolioVideo[]

  const categoryCounts = STAT_CATEGORIES.reduce<Record<string, number>>(
    (acc, { key }) => {
      acc[key] = allVideos.filter((v) => v.category === key).length
      return acc
    },
    {},
  )

  const visibleCount = allVideos.filter((v) => v.is_visible).length
  const hiddenCount = allVideos.length - visibleCount

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-mono tracking-widest uppercase text-[#ccc]">
          PORTFOLIO
        </h1>
        <p className="text-xs font-mono text-[#555] mt-1">Videos y contenido</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {STAT_CATEGORIES.map(({ key, label }) => (
          <StatCard key={key} label={label} count={categoryCounts[key] ?? 0} />
        ))}
        <StatCard label="Visibles" count={visibleCount} />
        <StatCard label="Ocultos" count={hiddenCount} />
      </div>

      {/* Video manager */}
      <VideoManager initialVideos={allVideos} />
    </div>
  )
}
