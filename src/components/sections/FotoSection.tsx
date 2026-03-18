'use client'
import { useRef } from 'react'
import Image from 'next/image'
import { registry, getAllProjects } from '@/lib/registry'

export function FotoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const projects = getAllProjects()

  return (
    <section
      ref={sectionRef}
      id="foto"
      style={{
        // Tall section — height drives scroll-based camera movement in WebGL canvas
        height: `${projects.length * 60}vh`,
        position: 'relative',
      }}
    >
      {/* Sticky section label — always visible while scrolling through gallery */}
      <div
        style={{
          position: 'sticky',
          top: '50vh',
          transform: 'translateY(-50%)',
          padding: '0 2rem',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          Fotografía
        </span>
      </div>

      {/* Mobile fallback grid — hidden on desktop (WebGL handles desktop) */}
      <div
        style={{ display: 'none' }}
        className="mobile-gallery"
      >
        {registry.photos.slice(0, 20).map((photo) => (
          <div key={photo.id} style={{ position: 'relative', aspectRatio: '4/3' }}>
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
