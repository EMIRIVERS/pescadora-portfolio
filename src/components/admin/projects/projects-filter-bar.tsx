'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useRef, useTransition } from 'react'
import { motion } from 'framer-motion'
import type { Client } from '@/lib/supabase/types'
import { X, Search } from 'lucide-react'

type StatusOption = 'all' | 'pre_production' | 'production' | 'post_production' | 'delivered'

const STATUS_PILLS: { value: StatusOption; label: string; color: string }[] = [
  { value: 'all',            label: 'Todos',          color: '' },
  { value: 'pre_production', label: 'Pre-produccion', color: '#FF9F0A' },
  { value: 'production',     label: 'Produccion',     color: '#0071E3' },
  { value: 'post_production',label: 'Post-produccion',color: '#BF5AF2' },
  { value: 'delivered',      label: 'Entregado',      color: '#30D158' },
]

interface Props {
  clients: Pick<Client, 'id' | 'name'>[]
  currentQ: string
  currentStatus: string
  currentClient: string
  hasFilters: boolean
}

export function ProjectsFilterBar({
  clients,
  currentQ,
  currentStatus,
  currentClient,
  hasFilters,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value && value !== 'all') {
          sp.set(key, value)
        }
      }
      const qs = sp.toString()
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname)
      })
    },
    [router, pathname]
  )

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ q: value, status: currentStatus, client: currentClient })
    }, 300)
  }

  function handleStatus(value: string) {
    navigate({ q: currentQ, status: value, client: currentClient })
  }

  function handleClient(value: string) {
    navigate({ q: currentQ, status: currentStatus, client: value })
  }

  function clearFilters() {
    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <motion.div
      className="flex flex-wrap items-center gap-3"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: 'var(--dash-text-tertiary)' }}
        />
        <input
          type="text"
          placeholder="Buscar por titulo..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--dash-surface-2)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--dash-text-primary)',
            fontSize: '13px',
            borderRadius: '10px',
            paddingLeft: '36px',
            paddingRight: '12px',
            paddingTop: '8px',
            paddingBottom: '8px',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,113,227,0.5)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--dash-border)'
          }}
        />
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_PILLS.map((pill) => {
          const isActive = currentStatus === pill.value
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => handleStatus(pill.value)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '20px',
                padding: '6px 16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isActive
                  ? pill.color
                    ? pill.color
                    : 'var(--dash-text-primary)'
                  : 'var(--dash-surface-2)',
                color: isActive
                  ? pill.color
                    ? '#fff'
                    : 'var(--dash-bg)'
                  : 'var(--dash-text-secondary)',
              }}
            >
              {pill.label}
            </button>
          )
        })}
      </div>

      {/* Client filter */}
      {clients.length > 0 && (
        <select
          value={currentClient}
          onChange={(e) => handleClient(e.target.value)}
          style={{
            background: 'var(--dash-surface-2)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--dash-text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '20px',
            padding: '6px 16px',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
          }}
        >
          <option value="all">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--dash-text-secondary)',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            opacity: isPending ? 0.4 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--dash-text-primary)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--dash-text-secondary)'
            e.currentTarget.style.borderColor = 'var(--dash-border)'
          }}
        >
          <X className="w-3 h-3" />
          Limpiar
        </button>
      )}

      {isPending && (
        <span style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', letterSpacing: '0.05em' }}>
          cargando...
        </span>
      )}
    </motion.div>
  )
}
