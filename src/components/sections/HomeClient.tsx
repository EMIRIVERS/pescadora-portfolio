'use client'

import { useState, useCallback } from 'react'
import { Hero } from '@/components/sections/Hero'
import PortfolioHeader from '@/components/sections/PortfolioHeader'
import ManifestoSection from '@/components/sections/ManifestoSection'
import PortfolioSection from '@/components/sections/PortfolioSection'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'

type AppPhase = 'landing' | 'exiting' | 'portfolio'

interface Props {
  cmsProjects: CmsProjectCard[]
}

export default function HomeClient({ cmsProjects }: Props) {
  const [phase, setPhase] = useState<AppPhase>('landing')

  const handleVerTrabajo = useCallback(() => setPhase('exiting'), [])
  const handleExitComplete = useCallback(() => setPhase('portfolio'), [])

  return (
    <>
      {/* Landing — fixed overlay, dismissed after fish dive */}
      {phase !== 'portfolio' && (
        <Hero
          triggerExit={phase === 'exiting'}
          onVerTrabajo={handleVerTrabajo}
          onExitComplete={handleExitComplete}
        />
      )}

      {/* Fixed header — appears after transition */}
      <PortfolioHeader visible={phase === 'portfolio'} />

      {/* Portfolio — surfaces from the depth where the fish dove */}
      <div
        style={{
          opacity: phase === 'portfolio' ? 1 : 0,
          transform: phase === 'portfolio' ? 'translateY(0)' : 'translateY(30px)',
          transition:
            'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          pointerEvents: phase === 'portfolio' ? 'auto' : 'none',
        }}
      >
        <main>
          <ManifestoSection />
          <PortfolioSection cmsProjects={cmsProjects} />
          <ServiciosSection />
          <ContactoSection />
        </main>
      </div>
    </>
  )
}
