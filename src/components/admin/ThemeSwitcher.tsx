'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Theme definitions ────────────────────────────────────────────────────────
export const THEMES = [
  {
    id: 'obsidian', name: 'Obsidian',
    accent: '#e8341a', accentHover: '#ff3a1f',
    bg: '#000000', surface1: '#111111', surface2: '#1C1C1E', surface3: '#2C2C2E',
    text: '#F5F5F7', textSecondary: '#86868B', textTertiary: '#48484A',
    border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
    light: {
      bg: '#F0F6FF', surface1: '#FFFFFF', surface2: '#E8F0FD', surface3: '#D4E6FF',
      text: '#0D1117', textSecondary: '#4A5568', textTertiary: '#9BA3AF',
      border: 'rgba(0,113,227,0.12)', borderStrong: 'rgba(0,113,227,0.22)',
      accent: '#0062C9', accentHover: '#0071E3',
    },
  },
  {
    id: 'midnight', name: 'Midnight',
    accent: '#5E5CE6', accentHover: '#6E6CF6',
    bg: '#0A0A1A', surface1: '#12122A', surface2: '#1E1E3A', surface3: '#2A2A4A',
    text: '#E8E8FF', textSecondary: '#8888BB', textTertiary: '#5555AA',
    border: 'rgba(140,140,255,0.1)', borderStrong: 'rgba(140,140,255,0.18)',
    light: {
      bg: '#F3F2FF', surface1: '#FFFFFF', surface2: '#EAEAFF', surface3: '#D8D6FF',
      text: '#1A1A2E', textSecondary: '#4A4A70', textTertiary: '#8888BB',
      border: 'rgba(94,92,230,0.12)', borderStrong: 'rgba(94,92,230,0.22)',
      accent: '#4B49C8', accentHover: '#5E5CE6',
    },
  },
  {
    id: 'forest', name: 'Forest',
    accent: '#30D158', accentHover: '#40E168',
    bg: '#050F07', surface1: '#0A1A0D', surface2: '#122018', surface3: '#1A2E20',
    text: '#E8FFE8', textSecondary: '#6B9B72', textTertiary: '#3A6B42',
    border: 'rgba(48,209,88,0.1)', borderStrong: 'rgba(48,209,88,0.18)',
    light: {
      bg: '#F0FFF4', surface1: '#FFFFFF', surface2: '#E2F9EA', surface3: '#C8F0D4',
      text: '#0A1F0E', textSecondary: '#2E6B3E', textTertiary: '#6B9B72',
      border: 'rgba(48,209,88,0.15)', borderStrong: 'rgba(48,209,88,0.28)',
      accent: '#1A9E3F', accentHover: '#25B84A',
    },
  },
  {
    id: 'sunset', name: 'Sunset',
    accent: '#FF6B35', accentHover: '#FF7B45',
    bg: '#0F0804', surface1: '#1A1008', surface2: '#241A10', surface3: '#2E2218',
    text: '#FFE8D6', textSecondary: '#9B7060', textTertiary: '#6B4030',
    border: 'rgba(255,107,53,0.12)', borderStrong: 'rgba(255,107,53,0.22)',
    light: {
      bg: '#FFF5F0', surface1: '#FFFFFF', surface2: '#FEEEE6', surface3: '#FDD8C6',
      text: '#1F0D06', textSecondary: '#7A4030', textTertiary: '#B07060',
      border: 'rgba(255,107,53,0.15)', borderStrong: 'rgba(255,107,53,0.28)',
      accent: '#D94E1A', accentHover: '#FF6B35',
    },
  },
  {
    id: 'rose', name: 'Rose',
    accent: '#FF375F', accentHover: '#FF476F',
    bg: '#0F0508', surface1: '#1A080F', surface2: '#24101A', surface3: '#2E1824',
    text: '#FFE0E8', textSecondary: '#9B6070', textTertiary: '#6B3040',
    border: 'rgba(255,55,95,0.12)', borderStrong: 'rgba(255,55,95,0.22)',
    light: {
      bg: '#FFF0F4', surface1: '#FFFFFF', surface2: '#FFE3EC', surface3: '#FFCCD9',
      text: '#1F050C', textSecondary: '#7A3050', textTertiary: '#C07080',
      border: 'rgba(255,55,95,0.15)', borderStrong: 'rgba(255,55,95,0.28)',
      accent: '#D42048', accentHover: '#FF375F',
    },
  },
  {
    id: 'aurora', name: 'Aurora',
    accent: '#64D2FF', accentHover: '#74E2FF',
    bg: '#030A10', surface1: '#071520', surface2: '#0D1F2D', surface3: '#132A3A',
    text: '#D6F0FF', textSecondary: '#6090A0', textTertiary: '#305060',
    border: 'rgba(100,210,255,0.1)', borderStrong: 'rgba(100,210,255,0.18)',
    light: {
      bg: '#F0FAFE', surface1: '#FFFFFF', surface2: '#E0F5FF', surface3: '#C0EBFF',
      text: '#061520', textSecondary: '#305060', textTertiary: '#6090A0',
      border: 'rgba(100,210,255,0.2)', borderStrong: 'rgba(100,210,255,0.35)',
      accent: '#0099CC', accentHover: '#00B0E8',
    },
  },
  {
    id: 'amber', name: 'Amber',
    accent: '#FFD60A', accentHover: '#FFE61A',
    bg: '#0F0B00', surface1: '#1A1400', surface2: '#24200A', surface3: '#2E2A12',
    text: '#FFF8D6', textSecondary: '#9B9060', textTertiary: '#6B6030',
    border: 'rgba(255,214,10,0.1)', borderStrong: 'rgba(255,214,10,0.18)',
    light: {
      bg: '#FFFDF0', surface1: '#FFFFFF', surface2: '#FFFBE0', surface3: '#FFF5B0',
      text: '#1A1600', textSecondary: '#6B5A00', textTertiary: '#9B8030',
      border: 'rgba(180,140,0,0.15)', borderStrong: 'rgba(180,140,0,0.28)',
      accent: '#B89000', accentHover: '#D4A800',
    },
  },
  {
    id: 'violet', name: 'Violet',
    accent: '#BF5AF2', accentHover: '#CF6AFF',
    bg: '#0A0510', surface1: '#12081C', surface2: '#1C1028', surface3: '#261834',
    text: '#F0DAFF', textSecondary: '#907AAA', textTertiary: '#604A7A',
    border: 'rgba(191,90,242,0.1)', borderStrong: 'rgba(191,90,242,0.18)',
    light: {
      bg: '#FAF0FF', surface1: '#FFFFFF', surface2: '#F3E3FF', surface3: '#E8CCFF',
      text: '#150A20', textSecondary: '#5A2D80', textTertiary: '#9070BB',
      border: 'rgba(191,90,242,0.15)', borderStrong: 'rgba(191,90,242,0.28)',
      accent: '#8B25D4', accentHover: '#A030F0',
    },
  },
  {
    id: 'slate', name: 'Slate',
    accent: '#98989D', accentHover: '#A8A8AD',
    bg: '#0A0A0A', surface1: '#141414', surface2: '#1E1E1E', surface3: '#282828',
    text: '#EBEBF5', textSecondary: '#8E8E93', textTertiary: '#5E5E63',
    border: 'rgba(152,152,157,0.1)', borderStrong: 'rgba(152,152,157,0.18)',
    light: {
      bg: '#F5F5F7', surface1: '#FFFFFF', surface2: '#F0EFF4', surface3: '#E5E4EA',
      text: '#111111', textSecondary: '#6E6E73', textTertiary: '#AEAEB2',
      border: 'rgba(0,0,0,0.07)', borderStrong: 'rgba(0,0,0,0.13)',
      accent: '#636366', accentHover: '#7E7E83',
    },
  },
  {
    id: 'crimson', name: 'Crimson',
    accent: '#E8341A', accentHover: '#F8442A',
    bg: '#0F0302', surface1: '#1A0804', surface2: '#241008', surface3: '#2E1810',
    text: '#FFE0D6', textSecondary: '#9B6050', textTertiary: '#6B3020',
    border: 'rgba(232,52,26,0.12)', borderStrong: 'rgba(232,52,26,0.22)',
    light: {
      bg: '#FFF2F0', surface1: '#FFFFFF', surface2: '#FFE6E2', surface3: '#FFCFC9',
      text: '#1F0503', textSecondary: '#7A2D1A', textTertiary: '#C07060',
      border: 'rgba(232,52,26,0.15)', borderStrong: 'rgba(232,52,26,0.28)',
      accent: '#C42012', accentHover: '#E8341A',
    },
  },
] as const

export type Theme = typeof THEMES[number]
export type ThemeId = Theme['id']

export const STORAGE_KEY = 'dash-theme'
const DEFAULT_THEME_ID: ThemeId = 'obsidian'

// ─── Apply theme to DOM ───────────────────────────────────────────────────────
export function applyTheme(theme: Theme): void {
  // 1. Set data-theme attribute — triggers all [data-theme="xxx"] CSS blocks in globals.css
  document.documentElement.setAttribute('data-theme', theme.id)

  // 2. Direct body background for immediate visual feedback
  document.body.style.backgroundColor = theme.bg
  document.body.style.color = theme.text

  // 3. CSS custom properties (for components that read var(--dash-*))
  const root = document.documentElement
  root.style.setProperty('--dash-bg', theme.bg)
  root.style.setProperty('--dash-surface-1', theme.surface1)
  root.style.setProperty('--dash-surface-2', theme.surface2)
  root.style.setProperty('--dash-surface-3', theme.surface3)
  root.style.setProperty('--dash-accent', theme.accent)
  root.style.setProperty('--dash-accent-hover', theme.accentHover)
  root.style.setProperty('--dash-text-primary', theme.text)
  root.style.setProperty('--dash-text-secondary', theme.textSecondary)
  root.style.setProperty('--dash-text-tertiary', theme.textTertiary)
  root.style.setProperty('--dash-border', theme.border)
  root.style.setProperty('--dash-border-strong', theme.borderStrong)

  // Legacy property names kept for backwards compatibility with sidebar.tsx T object
  root.style.setProperty('--dash-surface1', theme.surface1)
  root.style.setProperty('--dash-surface2', theme.surface2)
  root.style.setProperty('--dash-text', theme.text)

  // 4. Dispatch for sidebar and other same-tab listeners
  window.dispatchEvent(new CustomEvent('dash-theme-change', { detail: theme }))

  // 5. Persist
  localStorage.setItem(STORAGE_KEY, theme.id)
}

export function applyLightTheme(theme: Theme): void {
  const l = theme.light
  document.documentElement.setAttribute('data-theme', theme.id)
  document.documentElement.setAttribute('data-mode', 'light')
  document.body.style.backgroundColor = l.bg
  document.body.style.color = l.text

  const root = document.documentElement
  root.style.setProperty('--dash-bg', l.bg)
  root.style.setProperty('--dash-surface-1', l.surface1)
  root.style.setProperty('--dash-surface-2', l.surface2)
  root.style.setProperty('--dash-surface-3', l.surface3)
  root.style.setProperty('--dash-accent', l.accent)
  root.style.setProperty('--dash-accent-hover', l.accentHover)
  root.style.setProperty('--dash-text-primary', l.text)
  root.style.setProperty('--dash-text-secondary', l.textSecondary)
  root.style.setProperty('--dash-text-tertiary', l.textTertiary)
  root.style.setProperty('--dash-border', l.border)
  root.style.setProperty('--dash-border-strong', l.borderStrong)
  // Legacy
  root.style.setProperty('--dash-surface1', l.surface1)
  root.style.setProperty('--dash-surface2', l.surface2)
  root.style.setProperty('--dash-text', l.text)
  // Semantic colors adjusted for light backgrounds
  root.style.setProperty('--dash-success', '#1A8C3F')
  root.style.setProperty('--dash-warning', '#9C6800')
  root.style.setProperty('--dash-danger', '#C41D11')
  root.style.setProperty('--dash-info', '#0077AA')

  localStorage.setItem(STORAGE_KEY, theme.id)
}

export function getThemeById(id: string): Theme {
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
  const [activeId, setActiveId] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID
    return (localStorage.getItem(STORAGE_KEY) as ThemeId) ?? DEFAULT_THEME_ID
  })
  const [btnHovered, setBtnHovered] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Mount: apply the persisted theme to the DOM immediately
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
    applyTheme(theme)
  }

  const activeTheme = getThemeById(activeId)

  const font = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

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
          background: btnHovered ? 'var(--dash-border)' : 'transparent',
          color: btnHovered ? '#aeaeb2' : 'var(--dash-text-secondary)',
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
          <PaletteIcon color={btnHovered ? '#aeaeb2' : 'var(--dash-text-secondary)'} />
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
            background: 'var(--dash-surface-2, #1C1C1E)',
            border: '1px solid var(--dash-border, rgba(255,255,255,0.10))',
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
              color: 'var(--dash-text-secondary, #86868B)',
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
