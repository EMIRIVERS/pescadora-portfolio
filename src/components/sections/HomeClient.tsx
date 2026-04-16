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
import { AnimatedDots } from '@/components/ui/animated-dots'

interface Props {
  cmsProjects: CmsProjectCard[]
  videos?: VideoEntry[]
}

export default function HomeClient({ cmsProjects, videos }: Props) {
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setHeaderVisible(window.scrollY > window.innerHeight * 0.6)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -3%); }
          20% { transform: translate(3%, 2%); }
          30% { transform: translate(-1%, 4%); }
          40% { transform: translate(2%, -1%); }
          50% { transform: translate(-3%, 3%); }
          60% { transform: translate(4%, -2%); }
          70% { transform: translate(-2%, 1%); }
          80% { transform: translate(1%, -4%); }
          90% { transform: translate(3%, 2%); }
        }
      `}</style>

      {/* Fixed nav — appears after scrolling past hero */}
      <PortfolioHeader visible={headerVisible} />

      {/* Animated dots background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <AnimatedDots
          backgroundColor="rgba(8,8,8,0.18)"
          dotsNum={200}
          dotRadius={1}
          dotSpacing={8}
          speedRange={[4, 10]}
          opacity={0.9}
        />
      </div>

      {/* Film grain texture */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: '-50%',
          width: '200%',
          height: '200%',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 9000,
          animation: 'grain 0.8s steps(1) infinite',
        }}
      />

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
