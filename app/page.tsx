'use client'
import { useState, useCallback } from 'react'
import { Hero } from '@/components/sections/Hero'
import { FotoSection } from '@/components/sections/FotoSection'
import { VideoSection } from '@/components/sections/VideoSection'
import { SobreSection } from '@/components/sections/SobreSection'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'

type AppPhase = 'landing' | 'exiting' | 'portfolio'

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('landing')

  const handleVerTrabajo = useCallback(() => setPhase('exiting'), [])
  const handleExitComplete = useCallback(() => setPhase('portfolio'), [])

  return (
    <>
      {/* Landing — fixed overlay, dismissed after fish→static transition */}
      {phase !== 'portfolio' && (
        <Hero
          triggerExit={phase === 'exiting'}
          onVerTrabajo={handleVerTrabajo}
          onExitComplete={handleExitComplete}
        />
      )}

      {/* Portfolio — fades in after transition */}
      <div
        style={{
          opacity: phase === 'portfolio' ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: phase === 'portfolio' ? 'auto' : 'none',
        }}
      >
        <main>
          <FotoSection />
          <VideoSection />
          <SobreSection />
          <ServiciosSection />
          <ContactoSection />
        </main>
      </div>
    </>
  )
}
