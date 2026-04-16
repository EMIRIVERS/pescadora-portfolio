'use client'

import { useTransition, useState } from 'react'
import { updateProjectStatus } from '@/lib/actions/projects'
import type { ProjectStatus } from '@/lib/supabase/types'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  pre_production:  { label: 'Pre-produccion',  color: '#FF9F0A' },
  production:      { label: 'Produccion',       color: '#0071E3' },
  post_production: { label: 'Post-produccion',  color: '#BF5AF2' },
  delivered:       { label: 'Entregado',        color: '#30D158' },
}

const ALL_STATUSES: ProjectStatus[] = [
  'pre_production',
  'production',
  'post_production',
  'delivered',
]

interface Props {
  projectId: string
  currentStatus: ProjectStatus
}

export function StatusChanger({ projectId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState<ProjectStatus>(currentStatus)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { color } = STATUS_CONFIG[optimisticStatus]

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ProjectStatus
    const prev = optimisticStatus
    setOptimisticStatus(next)
    setErrorMsg(null)

    startTransition(async () => {
      const result = await updateProjectStatus(projectId, next)
      if (result.error) {
        setOptimisticStatus(prev)
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <select
        value={optimisticStatus}
        onChange={handleChange}
        disabled={pending}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          background: `${color}26`,
          color,
          border: '1px solid transparent',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.5 : 1,
          outline: 'none',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          whiteSpace: 'nowrap',
          transition: 'opacity 0.15s ease',
        }}
        aria-label="Cambiar estado del proyecto"
      >
        {ALL_STATUSES.map((s) => (
          <option
            key={s}
            value={s}
            style={{
              background: '#1C1C1E',
              color: STATUS_CONFIG[s].color,
              fontWeight: 600,
            }}
          >
            {STATUS_CONFIG[s].label}
          </option>
        ))}
      </select>

      {errorMsg && (
        <span
          style={{
            fontSize: '11px',
            color: '#FF453A',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          }}
        >
          {errorMsg}
        </span>
      )}
    </div>
  )
}
