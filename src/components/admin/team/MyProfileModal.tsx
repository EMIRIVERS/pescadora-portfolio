'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { updateMyProfile } from '@/lib/actions/invite-team-member'

interface Props {
  currentUser: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
  }
}

export default function MyProfileModal({ currentUser }: Props) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(currentUser.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleOpen() {
    // Reset to current values when opening
    setFullName(currentUser.full_name ?? '')
    setAvatarUrl(currentUser.avatar_url ?? '')
    setError(null)
    setSuccess(false)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateMyProfile(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setOpen(false), 1500)
      }
    })
  }

  const displayName = currentUser.full_name ?? currentUser.email ?? '?'
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          backgroundColor: 'var(--dash-surface-3)',
          color: 'var(--dash-text-primary)',
          borderRadius: '8px',
          padding: '9px 16px',
          fontSize: '14px',
          fontWeight: 500,
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          lineHeight: 1.4,
        }}
      >
        {currentUser.avatar_url ? (
          <Image
            src={currentUser.avatar_url}
            alt={displayName}
            width={20}
            height={20}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--dash-text-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--dash-text-primary)',
              flexShrink: 0,
            }}
          >
            {initial}
          </span>
        )}
        Mi perfil
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px',
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--dash-text-primary)',
                  letterSpacing: '-0.2px',
                }}
              >
                Mi perfil
              </h2>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--dash-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <label
                  htmlFor="mp-full-name"
                  style={{ display: 'block', fontSize: '12px', color: 'var(--dash-text-secondary)', marginBottom: '6px' }}
                >
                  Nombre
                </label>
                <input
                  id="mp-full-name"
                  name="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--dash-surface-3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--dash-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label
                  style={{ display: 'block', fontSize: '12px', color: 'var(--dash-text-secondary)', marginBottom: '6px' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={currentUser.email ?? ''}
                  readOnly
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--dash-surface-1)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--dash-text-tertiary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'default',
                  }}
                />
              </div>

              {/* Role (read-only) */}
              <div>
                <label
                  style={{ display: 'block', fontSize: '12px', color: 'var(--dash-text-secondary)', marginBottom: '6px' }}
                >
                  Rol
                </label>
                <input
                  type="text"
                  value={currentUser.role ?? 'Sin rol'}
                  readOnly
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--dash-surface-1)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--dash-text-tertiary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'default',
                  }}
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label
                  htmlFor="mp-avatar-url"
                  style={{ display: 'block', fontSize: '12px', color: 'var(--dash-text-secondary)', marginBottom: '6px' }}
                >
                  URL de foto de perfil
                </label>
                <input
                  id="mp-avatar-url"
                  name="avatar_url"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--dash-surface-3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--dash-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Avatar preview */}
              {avatarUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Image
                    src={avatarUrl}
                    alt="Vista previa"
                    width={40}
                    height={40}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                    onError={() => setAvatarUrl('')}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--dash-text-secondary)' }}>Vista previa</span>
                </div>
              )}

              {error && (
                <p style={{ margin: 0, fontSize: '13px', color: '#FF453A' }}>{error}</p>
              )}
              {success && (
                <p style={{ margin: 0, fontSize: '13px', color: '#30D158' }}>
                  Perfil actualizado correctamente
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  style={{
                    color: 'var(--dash-text-secondary)',
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
                    padding: '9px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.7 : 1,
                  }}
                >
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
