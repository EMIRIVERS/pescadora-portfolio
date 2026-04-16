'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'obsidian', name: 'Obsidian',
    accent: '#0071E3', bg: '#000000', surface1: '#111111', surface2: '#1C1C1E', text: '#F5F5F7',
  },
  {
    id: 'midnight', name: 'Midnight',
    accent: '#5E5CE6', bg: '#0A0A1A', surface1: '#12122A', surface2: '#1E1E3A', text: '#E8E8FF',
  },
  {
    id: 'forest', name: 'Forest',
    accent: '#30D158', bg: '#050F07', surface1: '#0A1A0D', surface2: '#122018', text: '#E8FFE8',
  },
  {
    id: 'sunset', name: 'Sunset',
    accent: '#FF6B35', bg: '#0F0804', surface1: '#1A1008', surface2: '#241A10', text: '#FFE8D6',
  },
  {
    id: 'rose', name: 'Rose',
    accent: '#FF375F', bg: '#0F0508', surface1: '#1A080F', surface2: '#24101A', text: '#FFE0E8',
  },
  {
    id: 'aurora', name: 'Aurora',
    accent: '#64D2FF', bg: '#030A10', surface1: '#071520', surface2: '#0D1F2D', text: '#D6F0FF',
  },
  {
    id: 'amber', name: 'Amber',
    accent: '#FFD60A', bg: '#0F0B00', surface1: '#1A1400', surface2: '#24200A', text: '#FFF8D6',
  },
  {
    id: 'violet', name: 'Violet',
    accent: '#BF5AF2', bg: '#0A0510', surface1: '#12081C', surface2: '#1C1028', text: '#F0DAFF',
  },
  {
    id: 'slate', name: 'Slate',
    accent: '#98989D', bg: '#0A0A0A', surface1: '#141414', surface2: '#1E1E1E', text: '#EBEBF5',
  },
  {
    id: 'crimson', name: 'Crimson',
    accent: '#E8341A', bg: '#0F0302', surface1: '#1A0804', surface2: '#241008', text: '#FFE0D6',
  },
] as const

type Theme = typeof THEMES[number]

const STORAGE_KEY = 'dash-theme'
const DEFAULT_THEME_ID: Theme['id'] = 'obsidian'

// ─── Apply theme to DOM ───────────────────────────────────────────────────────
function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.style.setProperty('--dash-accent', theme.accent)
  root.style.setProperty('--dash-bg', theme.bg)
  root.style.setProperty('--dash-surface1', theme.surface1)
  root.style.setProperty('--dash-surface2', theme.surface2)
  root.style.setProperty('--dash-text', theme.text)
  document.body.style.backgroundColor = theme.bg
}

function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

// ─── Palette SVG icon ─────────────────────────────────────────────────────────
function PaletteIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="13.5" cy="6.5" r=".5" fill={color} />
      <circle cx="17.5" cy="10.5" r=".5" fill={color} />
      <circle cx="8.5" cy="7.5" r=".5" fill={color} />
      <circle cx="6.5" cy="12.5" r=".5" fill={color} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  // Lazy initializer: read localStorage once on first render (client only)
  const [activeId, setActiveId] = useState<Theme['id']>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID
    return (localStorage.getItem(STORAGE_KEY) as Theme['id']) ?? DEFAULT_THEME_ID
  })
  const [btnHovered, setBtnHovered] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Mount: apply the persisted theme to the DOM
  useEffect(() => {
    applyTheme(getThemeById(activeId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return

    function onPointerDown(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function selectTheme(theme: Theme) {
    setActiveId(theme.id)
    localStorage.setItem(STORAGE_KEY, theme.id)
    applyTheme(theme)
  }

  const activeTheme = getThemeById(activeId)

  const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        title="Cambiar tema"
        aria-label="Selector de tema"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          border: 'none',
          background: btnHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          color: btnHovered ? '#aeaeb2' : '#86868B',
          fontFamily: font,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'background 0.15s ease, color 0.15s ease',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <PaletteIcon color={btnHovered ? '#aeaeb2' : '#86868B'} />
        </span>
        Tema
        {/* Active accent dot */}
        <span
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: activeTheme.accent,
            marginLeft: 'auto',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      </button>

      {/* Popover panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Seleccionar tema"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '8px',
            right: '8px',
            background: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 100,
          }}
        >
          {/* Grid 5x2 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            {THEMES.map((theme) => {
              const isSelected = theme.id === activeId
              return (
                <button
                  key={theme.id}
                  type="button"
                  title={theme.name}
                  aria-label={theme.name}
                  aria-pressed={isSelected}
                  onClick={() => selectTheme(theme)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: theme.accent,
                    border: isSelected
                      ? '2px solid #FFFFFF'
                      : '2px solid transparent',
                    outline: isSelected
                      ? `3px solid rgba(255,255,255,0.25)`
                      : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'border 0.15s ease, outline 0.15s ease, transform 0.1s ease',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    justifySelf: 'center',
                  }}
                />
              )
            })}
          </div>

          {/* Active theme name */}
          <p
            style={{
              margin: 0,
              fontFamily: font,
              fontSize: '11px',
              color: '#86868B',
              textAlign: 'center',
              letterSpacing: '0.02em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: activeTheme.accent,
                marginRight: '5px',
                verticalAlign: 'middle',
                marginBottom: '1px',
              }}
              aria-hidden="true"
            />
            {activeTheme.name}
          </p>
        </div>
      )}
    </div>
  )
}
