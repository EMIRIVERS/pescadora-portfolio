'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectOption {
  id: string
  title: string
}

interface ProjectFilterSelectProps {
  projects: ProjectOption[]
  currentProjectId?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectFilterSelect({
  projects,
  currentProjectId,
}: ProjectFilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      const params = new URLSearchParams()
      if (value) params.set('project', value)
      const search = params.toString()
      router.push(search ? `${pathname}?${search}` : pathname)
    },
    [router, pathname]
  )

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={currentProjectId ?? ''}
        onChange={handleChange}
        aria-label="Filtrar por proyecto"
        style={{
          backgroundColor: 'var(--dash-surface-2)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '5px 28px 5px 10px',
          fontSize: '13px',
          fontWeight: 500,
          color: currentProjectId ? 'var(--dash-text-primary)' : 'var(--dash-text-tertiary)',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          fontFamily: 'inherit',
          colorScheme: 'dark',
          minWidth: '160px',
        }}
      >
        <option value="">Todos los proyectos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '9px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--dash-text-tertiary)',
          fontSize: '10px',
          lineHeight: 1,
        }}
      >
        &#8964;
      </span>
    </div>
  )
}
