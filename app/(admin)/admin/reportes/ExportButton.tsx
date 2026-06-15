'use client'

import { Download } from 'lucide-react'
import type { Period } from './PeriodSelector'

interface ExportButtonProps {
  period: Period
  from?: string
  to?: string
}

export default function ExportButton({ period, from, to }: ExportButtonProps) {
  function handleExport() {
    const params = new URLSearchParams()
    if (period === 'custom' && from && to) {
      params.set('from', from)
      params.set('to', to)
    } else if (period !== 'all') {
      params.set('period', period)
    }
    const qs = params.toString()
    window.open(qs ? `/api/export/projects?${qs}` : '/api/export/projects', '_blank')
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
        border: '1px solid var(--dash-border)',
        background: 'transparent',
        color: 'var(--dash-text-secondary)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        transition: 'border-color 0.15s, color 0.15s',
        flexShrink: 0,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget
        btn.style.borderColor = 'var(--dash-border-strong)'
        btn.style.color = 'var(--dash-text-primary)'
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget
        btn.style.borderColor = 'var(--dash-border)'
        btn.style.color = 'var(--dash-text-secondary)'
      }}
      type="button"
      aria-label="Exportar proyectos a CSV"
    >
      <Download size={13} strokeWidth={2} />
      Exportar CSV
    </button>
  )
}
