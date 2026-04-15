'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Hero } from '@/components/sections/Hero'
import PortfolioHeader from '@/components/sections/PortfolioHeader'
import ManifestoSection from '@/components/sections/ManifestoSection'
import PortfolioSection from '@/components/sections/PortfolioSection'
import type { CmsProjectCard } from '@/components/sections/PortfolioSection'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation'

interface Props {
  cmsProjects: CmsProjectCard[]
}

export default function HomeClient({ cmsProjects }: Props) {
  const [showPortfolio, setShowPortfolio] = useState(false)

  const handleVerTrabajo = useCallback(() => setShowPortfolio(true), [])

  return (
    <>
      {/* Landing — fixed overlay, dismissed on click */}
      {!showPortfolio && (
        <Hero
          onVerTrabajo={handleVerTrabajo}
        />
      )}

      {/* Fixed header — appears after transition */}
      <PortfolioHeader visible={showPortfolio} />

      {/* Smoke background — fixed behind portfolio */}
      {showPortfolio && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.45 }}>
          <SmokeBackground smokeColor="#cc0000" />
        </div>
      )}

      {/* Portfolio — fades in after click */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={showPortfolio ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: 'relative',
          zIndex: 1,
          pointerEvents: showPortfolio ? 'auto' : 'none',
        }}
      >
        <main>
          <ManifestoSection />
          <PortfolioSection cmsProjects={cmsProjects} />
          <ServiciosSection />
          <ContactoSection />
        </main>
      </motion.div>
    </>
  )
}
