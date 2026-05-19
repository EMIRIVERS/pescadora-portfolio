'use client'
import { useState, useTransition } from 'react'
import { inviteTeamMember, addTeamMemberManually } from '@/lib/actions/invite-team-member'

const ROLES = ['Fotografo', 'Videografo', 'Editor', 'Director', 'Productor', 'Asistente']

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

type Tab = 'invite' | 'manual'

// ── Shared input style ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--dash-surface-3)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: 'var(--dash-text-primary)',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: SF,
}

// ── Tab button ─────────────────────────────────────────────────────────────────

interface TabBtnProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabBtn({ active, onClick, children }: TabBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        fontFamily: SF,
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
        backgroundColor: active ? 'var(--dash-surface-2)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #0071E3' : '2px solid transparent',
        padding: '9px 0',
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease',
        outline: 'none',
      }}
    >
      {children}
    </button>
  )
}

// ── Invite tab ─────────────────────────────────────────────────────────────────

function InviteTab({ onDone }: { onDone: () => void }) {
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
          onDone()
          setSuccess(false)
        }, 2000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="email"
        name="email"
        required
        placeholder="email@ejemplo.com"
        style={inputStyle}
      />
      <select
        name="role"
        defaultValue="Asistente"
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {error && <p style={{ margin: 0, fontSize: '13px', color: '#FF453A', fontFamily: SF }}>{error}</p>}
      {success && (
        <p style={{ margin: 0, fontSize: '13px', color: '#30D158', fontFamily: SF }}>
          Invitacion enviada a {submittedEmail}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          style={{ color: 'var(--dash-text-secondary)', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '14px', fontFamily: SF, cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{ backgroundColor: '#0071E3', color: '#ffffff', borderRadius: '8px', padding: '9px 18px', fontSize: '14px', fontWeight: 500, fontFamily: SF, border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? 'Enviando...' : 'Enviar invitacion'}
        </button>
      </div>
    </form>
  )
}

// ── Manual tab ─────────────────────────────────────────────────────────────────

function ManualTab({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Asistente')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!email.trim()) { setError('El email es obligatorio.'); return }
    setError(null)

    startTransition(async () => {
      const result = await addTeamMemberManually(name, email, role)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          onDone()
          setSuccess(false)
        }, 2000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="text"
        name="name"
        required
        placeholder="Nombre completo"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        type="email"
        name="email"
        required
        placeholder="email@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />
      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {error && <p style={{ margin: 0, fontSize: '13px', color: '#FF453A', fontFamily: SF }}>{error}</p>}
      {success && (
        <p style={{ margin: 0, fontSize: '13px', color: '#30D158', fontFamily: SF }}>
          Miembro agregado correctamente.
        </p>
      )}

      <p style={{ margin: 0, fontSize: '12px', color: 'var(--dash-text-tertiary)', fontFamily: SF }}>
        Se creara la cuenta sin enviar email. El usuario debera restablecer su contrasena para acceder.
      </p>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          style={{ color: 'var(--dash-text-secondary)', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '14px', fontFamily: SF, cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{ backgroundColor: '#0071E3', color: '#ffffff', borderRadius: '8px', padding: '9px 18px', fontSize: '14px', fontWeight: 500, fontFamily: SF, border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? 'Guardando...' : 'Agregar miembro'}
        </button>
      </div>
    </form>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function InviteMemberForm() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('invite')

  function handleOpen() { setOpen(true); setTab('invite') }
  function handleClose() { setOpen(false) }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        style={{
          backgroundColor: '#0071E3',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '9px 18px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: SF,
          border: 'none',
          cursor: 'pointer',
          lineHeight: 1.4,
        }}
      >
        + Agregar miembro
      </button>
    )
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--dash-surface-2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        minWidth: '280px',
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: '#141414',
        }}
      >
        <TabBtn active={tab === 'invite'} onClick={() => setTab('invite')}>
          Invitar por email
        </TabBtn>
        <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')}>
          Agregar manualmente
        </TabBtn>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {tab === 'invite' ? (
          <InviteTab onDone={handleClose} />
        ) : (
          <ManualTab onDone={handleClose} />
        )}
      </div>
    </div>
  )
}
