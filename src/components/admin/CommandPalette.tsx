'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FolderKanban,
  Users,
  Target,
  LayoutDashboard,
  Film,
  BarChart2,
  Kanban,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: 'rgba(0,0,0,0.7)',
  surface: 'var(--dash-surface-2)',
  surfaceHover: 'var(--dash-surface-3)',
  border: 'var(--dash-border)',
  borderStrong: 'var(--dash-border-strong)',
  textPrimary: 'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary: 'var(--dash-text-tertiary)',
  accent: 'var(--dash-accent)',
  font: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultKind = 'project' | 'client' | 'lead'

interface SearchResult {
  id: string
  kind: ResultKind
  label: string
  sublabel: string | null
  href: string
}

interface QuickLink {
  label: string
  href: string
  icon: React.ReactNode
}

// ─── Quick links shown when query is empty ────────────────────────────────────
const QUICK_LINKS: QuickLink[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={15} strokeWidth={1.5} /> },
  { label: 'Portfolio', href: '/admin/portfolio', icon: <Film size={15} strokeWidth={1.5} /> },
  { label: 'Reportes', href: '/admin/reportes', icon: <BarChart2 size={15} strokeWidth={1.5} /> },
  { label: 'Kanban', href: '/admin/kanban', icon: <Kanban size={15} strokeWidth={1.5} /> },
]

// ─── Icon map per result kind ─────────────────────────────────────────────────
function KindIcon({ kind }: { kind: ResultKind }) {
  const style = { flexShrink: 0, color: T.textSecondary }
  if (kind === 'project') return <FolderKanban size={15} strokeWidth={1.5} style={style} />
  if (kind === 'client') return <Users size={15} strokeWidth={1.5} style={style} />
  return <Target size={15} strokeWidth={1.5} style={style} />
}

const KIND_LABEL: Record<ResultKind, string> = {
  project: 'Proyecto',
  client: 'Cliente',
  lead: 'Lead',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // ── Toggle / open / close ──────────────────────────────────────────────────
  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setResults([])
    setActiveIndex(0)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(0)
  }, [])

  // ── Global keyboard listener ───────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          closePalette()
        } else {
          openPalette()
        }
        return
      }
      if (e.key === 'Escape' && open) {
        closePalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, openPalette, closePalette])

  // ── Custom event from sidebar trigger button ───────────────────────────────
  useEffect(() => {
    function onOpenEvent() {
      openPalette()
    }
    window.addEventListener('open-command-palette', onOpenEvent)
    return () => window.removeEventListener('open-command-palette', onOpenEvent)
  }, [openPalette])

  // ── Auto-focus input when opened ──────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // small delay to let AnimatePresence mount the element
      const id = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(id)
    }
  }, [open])

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)

    debounceRef.current = setTimeout(async () => {
      const q = query.trim()

      const [projectsRes, clientsRes, leadsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title')
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase
          .from('clients')
          .select('id, name, email, company')
          .ilike('name', `%${q}%`)
          .limit(5),
        supabase
          .from('leads')
          .select('id, name, email, company')
          .ilike('name', `%${q}%`)
          .limit(5),
      ])

      const combined: SearchResult[] = []

      for (const p of projectsRes.data ?? []) {
        combined.push({
          id: p.id as string,
          kind: 'project',
          label: p.title as string,
          sublabel: null,
          href: `/admin/projects/${p.id as string}`,
        })
      }

      for (const c of clientsRes.data ?? []) {
        const sub = [c.email, c.company].filter(Boolean).join(' · ')
        combined.push({
          id: c.id as string,
          kind: 'client',
          label: c.name as string,
          sublabel: sub || null,
          href: `/admin/clients/${c.id as string}`,
        })
      }

      for (const l of leadsRes.data ?? []) {
        const sub = [l.email, l.company].filter(Boolean).join(' · ')
        combined.push({
          id: l.id as string,
          kind: 'lead',
          label: l.name as string,
          sublabel: sub || null,
          href: `/admin/leads?lead=${l.id as string}`,
        })
      }

      setResults(combined)
      setActiveIndex(0)
      setLoading(false)
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // ── Keyboard navigation inside list ───────────────────────────────────────
  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const itemCount = query.trim() ? results.length : QUICK_LINKS.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(itemCount, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) {
        const item = results[activeIndex]
        if (item) navigate(item.href)
      } else {
        const item = QUICK_LINKS[activeIndex]
        if (item) navigate(item.href)
      }
    }
  }

  function navigate(href: string) {
    router.push(href)
    closePalette()
  }

  // ── Prevent body scroll when open ─────────────────────────────────────────
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
    <AnimatePresence>
      {open && (
        <motion.div
          key="cp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closePalette}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: T.bg,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90vw',
              maxWidth: '560px',
              background: T.surface,
              borderRadius: '16px',
              border: `1px solid ${T.borderStrong}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
              fontFamily: T.font,
            }}
          >
            {/* ── Search input ───────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
              }}
            >
              <Search
                size={18}
                strokeWidth={1.8}
                style={{ color: T.textSecondary, flexShrink: 0 }}
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Buscar proyectos, clientes, leads..."
                aria-label="Buscar"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: T.textPrimary,
                  fontSize: '16px',
                  fontFamily: T.font,
                  fontWeight: 400,
                  lineHeight: 1.4,
                }}
              />
              {loading && (
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `2px solid ${T.textTertiary}`,
                    borderTopColor: T.textSecondary,
                    display: 'inline-block',
                    animation: 'cp-spin 0.7s linear infinite',
                    flexShrink: 0,
                  }}
                />
              )}
              <kbd
                style={{
                  fontSize: '11px',
                  color: T.textTertiary,
                  background: 'var(--dash-border)',
                  border: `1px solid ${T.border}`,
                  borderRadius: '5px',
                  padding: '2px 6px',
                  fontFamily: T.font,
                  flexShrink: 0,
                }}
              >
                ESC
              </kbd>
            </div>

            {/* ── Separator ─────────────────────────────────────────────── */}
            <div style={{ height: '1px', background: T.border }} />

            {/* ── Content ───────────────────────────────────────────────── */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '8px 0' }}>
              {/* Empty query — show quick links */}
              {!query.trim() && (
                <div>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: T.textTertiary,
                      padding: '8px 20px 4px',
                      margin: 0,
                    }}
                  >
                    Accesos rápidos
                  </p>
                  {QUICK_LINKS.map((link, idx) => (
                    <QuickLinkRow
                      key={link.href}
                      link={link}
                      active={activeIndex === idx}
                      onHover={() => setActiveIndex(idx)}
                      onClick={() => navigate(link.href)}
                    />
                  ))}
                </div>
              )}

              {/* Has query, has results */}
              {query.trim() && !loading && results.length > 0 && (
                <ResultList
                  results={results}
                  activeIndex={activeIndex}
                  onHover={(i) => setActiveIndex(i)}
                  onSelect={(href) => navigate(href)}
                />
              )}

              {/* Has query, no results */}
              {query.trim() && !loading && results.length === 0 && (
                <div
                  style={{
                    padding: '32px 20px',
                    textAlign: 'center',
                    color: T.textTertiary,
                    fontSize: '14px',
                  }}
                >
                  Sin resultados para &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Spinner keyframe — injected once */}
      <style key="cp-style">{`
        @keyframes cp-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AnimatePresence>
  )
}

// ─── Quick link row ───────────────────────────────────────────────────────────
function QuickLinkRow({
  link,
  active,
  onHover,
  onClick,
}: {
  link: QuickLink
  active: boolean
  onHover: () => void
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 20px',
        background: active ? 'var(--dash-border)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        color: active ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
        fontSize: '14px',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        transition: 'background 0.1s ease, color 0.1s ease',
      }}
    >
      {link.icon}
      {link.label}
    </button>
  )
}

// ─── Result list grouped by kind ─────────────────────────────────────────────
function ResultList({
  results,
  activeIndex,
  onHover,
  onSelect,
}: {
  results: SearchResult[]
  activeIndex: number
  onHover: (i: number) => void
  onSelect: (href: string) => void
}) {
  // Group while preserving global index
  const groups: { kind: ResultKind; items: { result: SearchResult; globalIdx: number }[] }[] = []
  const kindsOrder: ResultKind[] = ['project', 'client', 'lead']

  for (const kind of kindsOrder) {
    const items = results
      .map((r, idx) => ({ result: r, globalIdx: idx }))
      .filter(({ result }) => result.kind === kind)
    if (items.length > 0) {
      groups.push({ kind, items })
    }
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.kind}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--dash-text-tertiary)',
              padding: '8px 20px 4px',
              margin: 0,
            }}
          >
            {KIND_LABEL[group.kind]}s
          </p>
          {group.items.map(({ result, globalIdx }) => (
            <ResultRow
              key={result.id}
              result={result}
              active={activeIndex === globalIdx}
              onHover={() => onHover(globalIdx)}
              onSelect={() => onSelect(result.href)}
            />
          ))}
        </div>
      ))}
    </>
  )
}

// ─── Individual result row ────────────────────────────────────────────────────
function ResultRow({
  result,
  active,
  onHover,
  onSelect,
}: {
  result: SearchResult
  active: boolean
  onHover: () => void
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 20px',
        background: active ? 'var(--dash-border)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s ease',
      }}
    >
      <KindIcon kind={result.kind} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--dash-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {result.label}
        </span>
        {result.sublabel && (
          <span
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--dash-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '1px',
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            {result.sublabel}
          </span>
        )}
      </span>
    </button>
  )
}
