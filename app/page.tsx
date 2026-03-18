'use client'
import { useState, useCallback } from 'react'
import * as THREE from 'three'
import { Hero } from '@/components/sections/Hero'
import { WebGLCanvas } from '@/components/canvas/WebGLCanvas'
import { RadialGallery } from '@/components/canvas/RadialGallery'
import { FotoSection } from '@/components/sections/FotoSection'
import { VideoSection } from '@/components/sections/VideoSection'
import { SobreSection } from '@/components/sections/SobreSection'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'

type AppPhase = 'landing' | 'exiting' | 'portfolio'

interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
}

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('landing')
  const [sceneCtx, setSceneCtx] = useState<SceneContext | null>(null)

  const handleVerTrabajo = useCallback(() => setPhase('exiting'), [])

  const handleExitComplete = useCallback(() => setPhase('portfolio'), [])

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Landing — fixed overlay, dismisses after animation                  */}
      {/* ------------------------------------------------------------------ */}
      {phase !== 'portfolio' && (
        <Hero
          triggerExit={phase === 'exiting'}
          onVerTrabajo={handleVerTrabajo}
          onExitComplete={handleExitComplete}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Portfolio — rendered once, fades in after transition                */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          opacity: phase === 'portfolio' ? 1 : 0,
          transition: 'opacity 0.6s ease',
          // Prevent interaction while hidden
          pointerEvents: phase === 'portfolio' ? 'auto' : 'none',
        }}
      >
        {/* WebGL canvas — position:fixed, z-index:0 */}
        <WebGLCanvas
          onSceneReady={(scene, camera, renderer) =>
            setSceneCtx({ scene, camera, renderer })
          }
        />

        {sceneCtx && (
          <RadialGallery
            scene={sceneCtx.scene}
            camera={sceneCtx.camera}
            sectionSelector="#foto"
          />
        )}

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
