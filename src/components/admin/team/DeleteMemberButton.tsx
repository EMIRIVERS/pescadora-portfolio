'use client'

import { useTransition, useState } from 'react'
import { removeTeamMember } from '@/lib/actions/invite-team-member'

interface Props {
  memberId: string
  memberName: string
}

export default function DeleteMemberButton({ memberId, memberName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    const confirmed = window.confirm(
      `Eliminar a "${memberName}" del equipo?\n\nEsta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      const result = await removeTeamMember(memberId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Eliminar miembro"
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '7px 10px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '12px',
          fontWeight: 500,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.5 : 1,
          backgroundColor: 'rgba(255,69,58,0.10)',
          color: 'var(--dash-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          transition: 'opacity 0.15s ease',
          fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        {isPending ? 'Eliminando...' : 'Eliminar miembro'}
      </button>
      {error && (
        <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--dash-danger)', marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}
