'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from '@/components/admin/sidebar'
import type { Profile } from '@/lib/supabase/types'

interface MobileNavProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
}

export default function MobileNav({ profile }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  // Close on escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* ── Hamburger trigger bar (mobile only) ───────────────────────── */}
      <div className="mobile-nav-trigger">
        <button
          type="button"
          aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'var(--dash-border)',
            color: 'var(--dash-text-primary)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>

        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '16px',
            color: 'var(--dash-text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          XICO
          <span
            style={{
              display: 'block',
              fontSize: '9px',
              color: 'var(--dash-text-secondary)',
              letterSpacing: '0.3em',
              marginTop: '2px',
              textTransform: 'uppercase',
              fontWeight: 400,
            }}
          >
            FILMS
          </span>
        </div>
      </div>

      {/* ── Overlay ───────────────────────────────────────────────────── */}
      {open && (
        <div
          className="mobile-sidebar-overlay"
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Drawer ────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegacion"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          zIndex: 1001,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
        onClick={(e) => {
          // Close if the user clicks a nav link inside the drawer
          const target = e.target as HTMLElement
          if (target.closest('a')) setOpen(false)
        }}
      >
        <Sidebar profile={profile} />
      </div>
    </>
  )
}
