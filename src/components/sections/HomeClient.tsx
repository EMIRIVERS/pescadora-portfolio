'use client'

import { useEffect, useState } from 'react'
import { Hero } from '@/components/sections/Hero'
import PortfolioHeader from '@/components/sections/PortfolioHeader'
import ManifestoSection from '@/components/sections/ManifestoSection'
import PortfolioSection from '@/components/sections/PortfolioSection'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import type { VideoEntry } from '@/types/media'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation'

interface Props {
  cmsProjects: CmsProjectCard[]
  videos?: VideoEntry[]
}

export default function HomeClient({ cmsProjects, videos }: Props) {
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setHeaderVisible(window.scrollY > window.innerHeight * 0.4)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Fixed nav — appears after scrolling past hero */}
      <PortfolioHeader visible={headerVisible} />

      {/* Smoke background — always present behind content */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.45 }}>
        <SmokeBackground smokeColor="#cc0000" />
      </div>

      <main style={{ position: 'relative', zIndex: 1 }}>
        <Hero />
        <PortfolioSection cmsProjects={cmsProjects} videos={videos} />
        <ManifestoSection />
        <ServiciosSection />
        <ContactoSection />
      </main>
    </>
  )
}
