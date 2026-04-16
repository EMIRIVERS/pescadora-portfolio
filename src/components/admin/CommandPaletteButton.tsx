'use client'

import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

export default function CommandPaletteButton() {
  const [hovered, setHovered] = useState(false)

  const open = useCallback(() => {
    window.dispatchEvent(new Event('open-command-palette'))
  }, [])

  return (
    <button
      type="button"
      onClick={open}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Abrir busqueda global (Cmd+K)"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 12px 5px 9px',
        borderRadius: '8px',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'}`,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        color: hovered ? '#aeaeb2' : '#86868B',
        fontFamily: FONT,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <Search size={13} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>Buscar...</span>
      <kbd
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          fontSize: '11px',
          color: '#48484A',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '5px',
          padding: '1px 5px',
          fontFamily: FONT,
          lineHeight: 1.4,
          marginLeft: '2px',
        }}
      >
        <span style={{ fontSize: '12px', lineHeight: 1 }}>&#8984;</span>K
      </kbd>
    </button>
  )
}
