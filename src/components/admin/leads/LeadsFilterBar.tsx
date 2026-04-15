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
  all: 'Todos',
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  won: 'Ganado',
  lost: 'Perdido',
}

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const
type StatusOption = (typeof STATUS_OPTIONS)[number]

const SOURCE_LABELS: Record<LeadSource | 'all', string> = {
  all: 'Todas fuentes',
  manual: 'Manual',
  referral: 'Referido',
  instagram: 'Instagram',
  web: 'Web',
  whatsapp: 'WhatsApp',
  other: 'Otro',
}

const SOURCE_OPTIONS = ['all', 'manual', 'referral', 'instagram', 'web', 'whatsapp', 'other'] as const
type SourceOption = (typeof SOURCE_OPTIONS)[number]

export default function LeadsFilterBar({ leads, onFiltered }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusOption>('all')
  const [source, setSource] = useState<SourceOption>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
        gap: '12px',
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
          background: '#111',
          border: '1px solid #222',
          borderRadius: 2,
          padding: '0.5rem 0.75rem',
          color: '#e8e8e8',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.75rem',
          outline: 'none',
          width: 220,
        }}
      />

      {/* Status filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map((s) => {
          const active = status === s
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: 2,
                fontSize: '0.6rem',
                fontFamily: 'var(--font-geist-mono)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                background: active ? '#1c1c1c' : 'transparent',
                color: active ? '#e8e8e8' : '#555',
                border: '1px solid',
                borderColor: active ? '#333' : 'transparent',
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          )
        })}
      </div>

      {/* Source filter dropdown */}
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as SourceOption)}
        style={{
          background: '#111',
          border: '1px solid #222',
          borderRadius: 2,
          padding: '0.5rem 0.75rem',
          color: source === 'all' ? '#555' : '#e8e8e8',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '0.75rem',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {SOURCE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABELS[s]}
          </option>
        ))}
      </select>

      {/* Clear button — only shown when a filter is active */}
      {isActive && (
        <button
          onClick={clearAll}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: 2,
            fontSize: '0.6rem',
            fontFamily: 'var(--font-geist-mono)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            background: 'transparent',
            color: '#666',
            border: '1px solid #333',
          }}
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
