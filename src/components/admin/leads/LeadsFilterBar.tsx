'use client'

import { useEffect, useRef, useState } from 'react'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
type LeadSource = 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other'

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: LeadStatus
  source: LeadSource
  notes: string | null
  budget_range: string | null
  project_type: string | null
  created_at: string
}

interface Props {
  leads: Lead[]
  onFiltered: (filtered: Lead[]) => void
}

const STATUS_LABELS: Record<LeadStatus | 'all', string> = {
  all:       'Todos',
  new:       'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal:  'Propuesta',
  won:       'Ganado',
  lost:      'Perdido',
}

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const
type StatusOption = (typeof STATUS_OPTIONS)[number]

const SOURCE_LABELS: Record<LeadSource | 'all', string> = {
  all:       'Todas fuentes',
  manual:    'Manual',
  referral:  'Referido',
  instagram: 'Instagram',
  web:       'Web',
  whatsapp:  'WhatsApp',
  other:     'Otro',
}

const SOURCE_OPTIONS = ['all', 'manual', 'referral', 'instagram', 'web', 'whatsapp', 'other'] as const
type SourceOption = (typeof SOURCE_OPTIONS)[number]

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

export default function LeadsFilterBar({ leads, onFiltered }: Props) {
  const [search, setSearch]               = useState('')
  const [status, setStatus]               = useState<StatusOption>('all')
  const [source, setSource]               = useState<SourceOption>('all')
  const [hoveredPill, setHoveredPill]     = useState<string | null>(null)
  const [hoveredClear, setHoveredClear]   = useState(false)
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const isActive = debouncedSearch !== '' || status !== 'all' || source !== 'all'

  // Debounce search input at 200ms
  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 200)
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [search])

  // Recompute filtered leads whenever filters change
  useEffect(() => {
    const q = debouncedSearch.toLowerCase()
    const filtered = leads.filter((lead) => {
      const matchesSearch =
        q === '' ||
        lead.name.toLowerCase().includes(q) ||
        (lead.email !== null && lead.email.toLowerCase().includes(q)) ||
        (lead.company !== null && lead.company.toLowerCase().includes(q))

      const matchesStatus = status === 'all' || lead.status === status
      const matchesSource = source === 'all' || lead.source === source

      return matchesSearch && matchesStatus && matchesSource
    })
    onFiltered(filtered)
  }, [debouncedSearch, status, source, leads, onFiltered])

  function clearAll() {
    setSearch('')
    setDebouncedSearch('')
    setStatus('all')
    setSource('all')
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Search input */}
      <input
        type="text"
        placeholder="Buscar leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          background: '#1C1C1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '7px 14px',
          color: '#F5F5F7',
          fontFamily: FONT,
          fontSize: 12,
          outline: 'none',
          width: 220,
        }}
      />

      {/* Status filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map((s) => {
          const active  = status === s
          const hovered = hoveredPill === `status-${s}`

          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              onMouseEnter={() => setHoveredPill(`status-${s}`)}
              onMouseLeave={() => setHoveredPill(null)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                fontFamily: FONT,
                cursor: 'pointer',
                border: 'none',
                background: active
                  ? '#0071E3'
                  : hovered
                  ? '#2C2C2E'
                  : 'transparent',
                color: active ? '#FFFFFF' : '#86868B',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          )
        })}
      </div>

      {/* Source filter — pill select */}
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as SourceOption)}
        style={{
          background: '#1C1C1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '6px 14px',
          color: source === 'all' ? '#86868B' : '#F5F5F7',
          fontFamily: FONT,
          fontSize: 12,
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          paddingRight: 28,
        }}
      >
        {SOURCE_OPTIONS.map((s) => (
          <option key={s} value={s} style={{ background: '#1C1C1E', color: '#F5F5F7' }}>
            {SOURCE_LABELS[s]}
          </option>
        ))}
      </select>

      {/* Clear button — only shown when a filter is active */}
      {isActive && (
        <button
          onClick={clearAll}
          onMouseEnter={() => setHoveredClear(true)}
          onMouseLeave={() => setHoveredClear(false)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontFamily: FONT,
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
            background: hoveredClear ? '#2C2C2E' : 'transparent',
            color: '#86868B',
            transition: 'background 0.15s',
          }}
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
