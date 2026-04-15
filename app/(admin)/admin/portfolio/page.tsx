import { createServiceClient } from '@/lib/supabase/server'
import VideoManager from '@/components/admin/portfolio/VideoManager'
import type { PortfolioVideo } from '@/lib/supabase/types'

export default async function PortfolioAdminPage() {
  const supabase = createServiceClient()
  const { data: videos } = await supabase
    .from('portfolio_videos')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-mono tracking-widest uppercase text-[#ccc]">Portfolio</h1>
        <p className="text-xs font-mono text-[#555] mt-1">Gestiona los videos del portfolio publico</p>
      </div>
      <VideoManager videos={(videos ?? []) as PortfolioVideo[]} />
    </div>
  )
}
