import type { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'

/**
 * Shared cinematic-editorial UI primitives for the client portal.
 * Pure presentational, server-safe (no hooks) — usable in any portal page.
 * Brand: black #050505, cream #ede8e0, red #e8341a, Cormorant serif display,
 * Geist Mono metadata labels. Colors come from the --portal-* CSS tokens.
 */

export const PORTAL = {
  cream: 'var(--portal-text)',
  strong: 'var(--portal-text-strong)',
  muted: 'var(--portal-text-muted)',
  dim: 'var(--portal-text-dim)',
  accent: 'var(--portal-accent)',
  border: 'var(--portal-border)',
  bg: 'var(--portal-bg)',
  surface: 'var(--portal-surface)',
  serif: 'var(--portal-serif)',
  mono: 'var(--portal-mono)',
  sans: 'var(--portal-sans)',
} as const

// ── Page shell ──────────────────────────────────────────────────────────────
export function PortalShell({ maxWidth = 1080, children }: { maxWidth?: number; children: ReactNode }) {
  return (
    <main className="portal-page">
      <div
        className="mx-auto px-5 sm:px-6"
        style={{ maxWidth, paddingTop: 'clamp(2.5rem, 5vw, 4rem)', paddingBottom: '6rem' }}
      >
        {children}
      </div>
    </main>
  )
}

// ── Back link ───────────────────────────────────────────────────────────────
export function BackLink({ href, label = 'Inicio' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="portal-backlink" style={{ marginBottom: '2.2rem' }}>
      <span aria-hidden="true">&larr;</span>
      {label}
    </Link>
  )
}

// ── Masthead (page title block) ──────────────────────────────────────────────
export function Masthead({
  eyebrow = 'Portal de cliente',
  title,
  accent,
  lead,
}: {
  eyebrow?: string
  title: string
  accent?: string
  lead?: string
}) {
  return (
    <header style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
      <p style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: PORTAL.dim, margin: '0 0 1.1rem' }}>
        <span style={{ color: PORTAL.accent, marginRight: '0.6rem' }}>&mdash;&mdash;</span>
        {eyebrow}
      </p>
      <h1 style={{ fontFamily: PORTAL.serif, fontWeight: 400, fontSize: 'clamp(2.3rem, 6vw, 3.8rem)', lineHeight: 1.04, letterSpacing: '-0.01em', color: PORTAL.cream, margin: 0 }}>
        {title}
        {accent && <span style={{ fontStyle: 'italic', color: PORTAL.accent }}> {accent}</span>}
      </h1>
      {lead && (
        <p style={{ fontFamily: PORTAL.sans, fontSize: '0.95rem', lineHeight: 1.6, color: PORTAL.muted, margin: '1.2rem 0 0', maxWidth: '42rem' }}>
          {lead}
        </p>
      )}
    </header>
  )
}

// ── Section label (mono eyebrow with optional index) ─────────────────────────
export function SectionLabel({ index, children, style }: { index?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem', ...style }}>
      {index && <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.2em', color: PORTAL.accent }}>{index}</span>}
      <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: PORTAL.muted }}>
        {children}
      </span>
    </div>
  )
}

// ── Status tag (colored dot + mono label) ────────────────────────────────────
export function StatusTag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 shrink-0" style={{ fontFamily: PORTAL.mono, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
      {children}
    </span>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  body,
  ctaHref = 'mailto:hola@xicofilms.com',
  ctaLabel = 'Contactar a XICO Films',
}: {
  title: string
  body?: string
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <div style={{ border: `1px solid ${PORTAL.border}`, borderRadius: '6px', padding: 'clamp(3rem, 8vw, 5rem) 2rem', textAlign: 'center' }}>
      <p style={{ fontFamily: PORTAL.serif, fontStyle: 'italic', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', color: PORTAL.cream, margin: 0 }}>
        {title}
      </p>
      {body && (
        <p style={{ fontFamily: PORTAL.sans, fontSize: '0.9rem', color: PORTAL.muted, margin: '0.9rem auto 0', maxWidth: '28rem', lineHeight: 1.6 }}>
          {body}
        </p>
      )}
      {ctaLabel && (
        <a href={ctaHref} className="portal-textlink" style={{ display: 'inline-block', marginTop: '1.6rem', fontFamily: PORTAL.mono, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: PORTAL.accent }}>
          {ctaLabel} &rarr;
        </a>
      )}
    </div>
  )
}
