'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { SHIMMER_STYLE } from '@/lib/media'

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

type Entrance = 'fade-up-30' | 'fade-up-20' | 'none'
type Gradient = 'soft' | 'cms' | 'none'

const GRADIENTS: Record<Exclude<Gradient, 'none'>, string> = {
  soft: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))',
  cms: 'linear-gradient(transparent 30%, rgba(0,0,0,0.85))',
}

export interface MediaTileProps {
  src: string | null
  alt: string
  /** Aspect-box height as a CSS paddingBottom value. Default '75%'. */
  aspect?: string
  /** Bottom-left title. Omit for bare image cells. */
  label?: string
  /** Bottom-right meta (e.g. "12 fotos"). */
  meta?: string
  /** Provide to make the tile a keyboard-operable button. */
  onActivate?: () => void
  ariaLabel?: string
  /** Entrance animation + stagger. 'none' renders a plain box. */
  entrance?: Entrance
  index?: number
  priority?: boolean
  eager?: boolean
  sizes?: string
  hoverScale?: number
  gradient?: Gradient
  labelSize?: string
}

/**
 * Dumb portfolio image tile: aspect box + shimmer skeleton + fade-in image,
 * optional gradient/label/meta and optional keyboard-operable activation.
 * Replaces the AlbumTile / PhotoProjectTile / AlbumPhotoCell /
 * RegistryPhotoCell / CmsProjectTile copies. Intentionally NOT used for
 * PortfolioCard or the overlay VideoTile — those carry distinct behavior
 * (frozen-GIF, Vimeo hover preview) and folding them in would explode props.
 */
export default function MediaTile({
  src,
  alt,
  aspect = '75%',
  label,
  meta,
  onActivate,
  ariaLabel,
  entrance = 'none',
  index = 0,
  priority,
  eager,
  sizes = '(max-width: 640px) 100vw, 50vw',
  hoverScale = 1.04,
  gradient = 'soft',
  labelSize = 'clamp(0.9rem, 2vw, 1.4rem)',
}: MediaTileProps) {
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const interactive = typeof onActivate === 'function'

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!onActivate) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
    [onActivate],
  )

  const motionProps =
    entrance === 'none'
      ? {}
      : entrance === 'fade-up-20'
        ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.4, delay: index * 0.05, ease: EASE },
          }
        : {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.45, delay: 0.15 + index * 0.07, ease: EASE },
          }

  return (
    <motion.div
      {...motionProps}
      className={interactive ? 'media-tile' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      onClick={onActivate}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: aspect,
        overflow: 'hidden',
        background: '#111',
        cursor: interactive ? 'pointer' : undefined,
      }}
    >
      {src && !loaded && <div style={SHIMMER_STYLE} />}
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : eager ? 'eager' : 'lazy'}
          onLoad={() => setLoaded(true)}
          style={{
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'transform 0.6s ease, opacity 0.4s ease',
            transform: interactive && hovered ? `scale(${hoverScale})` : 'scale(1)',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111' }} />
      )}

      {gradient !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: GRADIENTS[gradient],
            pointerEvents: 'none',
          }}
        />
      )}

      {label && (
        <span
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 700,
            fontSize: labelSize,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: '#ede8e0',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      )}

      {meta && (
        <span
          style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.6rem',
            color: '#6b6560',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          {meta}
        </span>
      )}
    </motion.div>
  )
}
