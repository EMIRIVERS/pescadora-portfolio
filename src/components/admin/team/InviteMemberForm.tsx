'use client'
import { useState, useTransition } from 'react'
import { inviteTeamMember } from '../../../../app/actions/invite-team-member'

const ROLES = ['Fotógrafo', 'Videógrafo', 'Editor', 'Director', 'Productor', 'Asistente']

export default function InviteMemberForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim().toLowerCase()
    setError(null)
    setSuccess(false)
    setSubmittedEmail(email)

    startTransition(async () => {
      const result = await inviteTeamMember(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 2000)
      }
    })
  }

  function handleCancel() {
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          backgroundColor: '#0071E3',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '9px 18px',
          fontSize: '14px',
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
          lineHeight: 1.4,
        }}
      >
        + Invitar miembro
      </button>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#1C1C1E',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        minWidth: '280px',
      }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          name="email"
          required
          placeholder="email@ejemplo.com"
          style={{
            backgroundColor: '#2C2C2E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#F5F5F7',
            fontSize: '14px',
            width: '100%',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <select
          name="role"
          defaultValue="Asistente"
          style={{
            backgroundColor: '#2C2C2E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#F5F5F7',
            fontSize: '14px',
            width: '100%',
            outline: 'none',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {error && (
          <p style={{ margin: 0, fontSize: '13px', color: '#FF453A' }}>{error}</p>
        )}

        {success && (
          <p style={{ margin: 0, fontSize: '13px', color: '#30D158' }}>
            Invitacion enviada a {submittedEmail}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            style={{
              color: '#86868B',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 14px',
              fontSize: '14px',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            style={{
              backgroundColor: '#0071E3',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Enviando...' : 'Enviar invitacion'}
          </button>
        </div>
      </form>
    </div>
  )
}
