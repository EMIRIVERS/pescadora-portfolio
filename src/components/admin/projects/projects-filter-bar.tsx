'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useRef, useTransition } from 'react'
import type { Client } from '@/lib/supabase/types'
import { X, Search } from 'lucide-react'

type StatusOption = 'all' | 'pre_production' | 'production' | 'post_production' | 'delivered'

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pre_production', label: 'Pre-produccion' },
  { value: 'production', label: 'Produccion' },
  { value: 'post_production', label: 'Post-produccion' },
  { value: 'delivered', label: 'Entregado' },
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
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444] pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por titulo..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] text-[#ccc] placeholder-[#444] text-xs font-mono rounded-sm pl-8 pr-3 py-2 focus:outline-none focus:border-[#333] transition-colors"
        />
      </div>

      {/* Status filter */}
      <select
        value={currentStatus}
        onChange={(e) => handleStatus(e.target.value)}
        className="bg-[#0d0d0d] border border-[#1a1a1a] text-xs font-mono text-[#888] rounded-sm px-3 py-2 focus:outline-none focus:border-[#333] transition-colors appearance-none cursor-pointer"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Client filter */}
      <select
        value={currentClient}
        onChange={(e) => handleClient(e.target.value)}
        className="bg-[#0d0d0d] border border-[#1a1a1a] text-xs font-mono text-[#888] rounded-sm px-3 py-2 focus:outline-none focus:border-[#333] transition-colors appearance-none cursor-pointer"
      >
        <option value="all">Todos los clientes</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-[#666] hover:text-[#ccc] border border-[#1a1a1a] hover:border-[#333] rounded-sm transition-colors disabled:opacity-40"
        >
          <X className="w-3 h-3" />
          Limpiar filtros
        </button>
      )}

      {isPending && (
        <span className="text-[10px] font-mono text-[#444] tracking-wide">
          cargando...
        </span>
      )}
    </div>
  )
}
