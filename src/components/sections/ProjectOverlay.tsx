'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { registry } from '@/lib/registry'
import { useFocusTrap, rectToClipInset } from '@/components/portfolio/overlay/lib'
import { VideoGrid, VideoDetail } from '@/components/portfolio/overlay/VideoViews'
import {
  DbAlbumsGrid,
  DbAlbumDetail,
  PhotoProjectsGrid,
  PhotoProjectDetail,
} from '@/components/portfolio/overlay/PhotoViews'
import type { VideoEntry } from '@/types/media'
import type { PhotoAlbum } from '@/types/media'

const CATEGORY_LABEL: Record<string, string> = {
  videoclips: 'Videoclips',
  corporativos: 'Corporativos',
  restaurantes: 'Restaurantes',
  comerciales: 'Comerciales',
  fotografia: 'Fotografía',
}

interface ProjectOverlayProps {
  projectName: string
  mediaType: 'video' | 'fotografia'
  origin: { x: number; y: number; w: number; h: number }
  onClose: () => void
  videos?: VideoEntry[]
  fotoEntries?: VideoEntry[]
  photoAlbums?: PhotoAlbum[]
}

/**
 * Smart container for the portfolio overlay: owns the view state machine
 * (video / album / photo-project selection + close animation), keyboard
 * Escape handling, focus trap and the clip-path reveal chrome. All visual
 * sub-views live in @/components/portfolio/overlay/*.
 */
export default function ProjectOverlay({ projectName, mediaType, origin, onClose, videos, photoAlbums }: ProjectOverlayProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null)
  const [selectedPhotoProject, setSelectedPhotoProject] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  // Track the element that triggered the overlay so focus can be restored on close
  const triggerRef = useRef<HTMLElement | null>(null)

  const initialClip = rectToClipInset(origin)

  useEffect(() => {
    // Capture the currently focused element before the overlay steals focus
    triggerRef.current = document.activeElement as HTMLElement | null
  }, [])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      // Restore focus after React has unmounted the overlay
      triggerRef.current?.focus()
    }, 500)
  }, [onClose])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVideo) { setSelectedVideo(null); return }
        if (selectedAlbum) { setSelectedAlbum(null); return }
        if (selectedPhotoProject) { setSelectedPhotoProject(null); return }
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedVideo, selectedPhotoProject, selectedAlbum, handleClose])

  // Focus trap for the main overlay panel
  useFocusTrap(overlayRef, triggerRef)

  const videoSource = videos && videos.length > 0 ? videos : registry.videos
  const overlayVideos: VideoEntry[] = mediaType === 'video'
    ? videoSource.filter((v) => v.category === projectName)
    : []

  const overlayTitle = CATEGORY_LABEL[projectName] ?? projectName

  if (selectedVideo) {
    return (
      <AnimatePresence mode="wait">
        <VideoDetail key="vd" video={selectedVideo} onBack={() => setSelectedVideo(null)} onClose={handleClose} />
      </AnimatePresence>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel principal con clip-path reveal */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={overlayTitle}
        data-lenis-prevent
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#050505',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          clipPath: isClosing ? initialClip : 'inset(0px 0px 0px 0px round 0px)',
          WebkitClipPath: isClosing ? initialClip : 'inset(0px 0px 0px 0px round 0px)',
          transition: `clip-path 0.55s cubic-bezier(0.77, 0, 0.175, 1), -webkit-clip-path 0.55s cubic-bezier(0.77, 0, 0.175, 1)`,
          animation: isClosing ? 'none' : 'overlayClipReveal 0.55s cubic-bezier(0.77, 0, 0.175, 1) forwards',
        }}
      >
        <style>{`
          @keyframes overlayClipReveal {
            from { clip-path: ${initialClip}; -webkit-clip-path: ${initialClip}; }
            to   { clip-path: inset(0px 0px 0px 0px round 0px); -webkit-clip-path: inset(0px 0px 0px 0px round 0px); }
          }
        `}</style>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(5,5,5,0.95)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.5rem clamp(1rem, 4vw, 2rem)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-sans)', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.5vw, 1rem)', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ede8e0' }}>
            {overlayTitle}
          </span>
          <button onClick={handleClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ede8e0', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1, transition: 'transform 0.3s ease', minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(90deg)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(0deg)' }}>
            &#10005;
          </button>
        </motion.header>

        {/* VIDEO grid */}
        {mediaType === 'video' && (
          <VideoGrid videos={overlayVideos} onSelect={setSelectedVideo} />
        )}

        {/* FOTOGRAFÍA: DB albums (priority) */}
        {mediaType === 'fotografia' && photoAlbums && photoAlbums.length > 0 && !selectedAlbum && (
          <DbAlbumsGrid albums={photoAlbums} onSelect={setSelectedAlbum} />
        )}

        {mediaType === 'fotografia' && selectedAlbum && (
          <AnimatePresence mode="wait">
            <DbAlbumDetail
              key={selectedAlbum.id}
              album={selectedAlbum}
              onBack={() => setSelectedAlbum(null)}
              onClose={handleClose}
            />
          </AnimatePresence>
        )}

        {/* FOTOGRAFÍA: fallback a registro estático si no hay albums DB */}
        {mediaType === 'fotografia' && (!photoAlbums || photoAlbums.length === 0) && !selectedPhotoProject && (
          <PhotoProjectsGrid onSelect={setSelectedPhotoProject} />
        )}

        {mediaType === 'fotografia' && (!photoAlbums || photoAlbums.length === 0) && selectedPhotoProject && (
          <AnimatePresence mode="wait">
            <PhotoProjectDetail
              key={selectedPhotoProject}
              projectName={selectedPhotoProject}
              onBack={() => setSelectedPhotoProject(null)}
              onClose={handleClose}
            />
          </AnimatePresence>
        )}
      </div>
    </>
  )
}
