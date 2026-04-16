'use client'

import { Download } from 'lucide-react'

type Period = 'month' | '3months' | 'year' | 'all'

interface ExportButtonProps {
  period: Period
}

export default function ExportButton({ period }: ExportButtonProps) {
  function handleExport() {
    const url =
      period === 'all'
        ? '/api/export/projects'
        : `/api/export/projects?period=${period}`
    window.open(url, '_blank')
  }

  return (
    <button
      onClick={handleExport}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'transparent',
        color: '#86868B',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        transition: 'border-color 0.15s, color 0.15s',
        flexShrink: 0,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget
        btn.style.borderColor = 'rgba(255,255,255,0.28)'
        btn.style.color = '#F5F5F7'
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget
        btn.style.borderColor = 'rgba(255,255,255,0.12)'
        btn.style.color = '#86868B'
      }}
      type="button"
      aria-label="Exportar proyectos a CSV"
    >
      <Download size={13} strokeWidth={2} />
      Exportar CSV
    </button>
  )
}
