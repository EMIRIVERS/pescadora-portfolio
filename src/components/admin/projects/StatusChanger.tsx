'use client'

import { useTransition, useState } from 'react'
import { motion } from 'framer-motion'
import { updateProjectStatus } from '@/lib/actions/projects'
import type { ProjectStatus } from '@/lib/supabase/types'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  pre_production:  { label: 'Pre-producción',  color: '#FF9F0A' },
  production:      { label: 'Producción',       color: 'var(--dash-accent)' },
  post_production: { label: 'Post-producción',  color: '#BF5AF2' },
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
      <motion.div
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.12 }}
        style={{ display: 'inline-flex' }}
      >
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
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
          border: '1px solid transparent',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.5 : 1,
          outline: 'none',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
              background: 'var(--dash-surface-2)',
              color: STATUS_CONFIG[s].color,
              fontWeight: 600,
            }}
          >
            {STATUS_CONFIG[s].label}
          </option>
        ))}
      </select>
      </motion.div>

      {errorMsg && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--dash-danger)',
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {errorMsg}
        </span>
      )}
    </div>
  )
}
