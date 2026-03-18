'use client'
import { useState } from 'react'
import * as THREE from 'three'
import { WebGLCanvas } from '@/components/canvas/WebGLCanvas'
import { RadialGallery } from '@/components/canvas/RadialGallery'
import { Hero } from '@/components/sections/Hero'
import { FotoSection } from '@/components/sections/FotoSection'
import { VideoSection } from '@/components/sections/VideoSection'
import { SobreSection } from '@/components/sections/SobreSection'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'

interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
}

export default function Home() {
  // useState (not useRef) — triggers re-render so RadialGallery mounts after WebGL is ready
  const [sceneCtx, setSceneCtx] = useState<SceneContext | null>(null)

  return (
    <>
      {/* WebGL canvas — position:fixed, z-index:0, beneath all DOM content */}
      <WebGLCanvas
        onSceneReady={(scene, camera, renderer) =>
          setSceneCtx({ scene, camera, renderer })
        }
      />

      {/* Radial gallery mounts only after scene is ready */}
      {sceneCtx && (
        <RadialGallery
          scene={sceneCtx.scene}
          camera={sceneCtx.camera}
          sectionSelector="#foto"
        />
      )}

      {/* DOM layer — sits above canvas via z-index:1 in globals.css */}
      <main>
        <Hero />
        <FotoSection />
        <VideoSection />
        <SobreSection />
        <ServiciosSection />
        <ContactoSection />
      </main>
    </>
  )
}
