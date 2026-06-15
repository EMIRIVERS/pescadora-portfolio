'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'
import { PORTAL } from '@/components/portal/ui'

// ---------------------------------------------------------------------------
// Supabase browser client (singleton for this component)
// ---------------------------------------------------------------------------

function getSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileEditFormProps {
  profileId: string
  initialFullName: string | null
}

type SaveState = 'idle' | 'saving' | 'success' | 'error'

export default function ProfileEditForm({ profileId, initialFullName }: ProfileEditFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDirty = fullName.trim() !== (initialFullName ?? '').trim()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!isDirty) return

    startTransition(async () => {
      setSaveState('saving')
      setErrorMessage(null)

      const supabase = getSupabaseBrowser()

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', profileId)

      if (error) {
        setSaveState('error')
        setErrorMessage('No se pudo guardar. Intenta de nuevo.')
      } else {
        setSaveState('success')
        // Refresca Server Components (header del layout muestra el nombre).
        router.refresh()
        setTimeout(() => setSaveState('idle'), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <style>{`
        .portal-input {
          width: 100%;
          background: var(--portal-surface-2);
          border: 1px solid var(--portal-border);
          color: var(--portal-text);
          font-family: var(--portal-sans);
          font-size: 0.95rem;
          border-radius: 4px;
          padding: 0.8rem 1rem;
          outline: none;
          transition: border-color 0.25s ease, background 0.25s ease;
        }
        .portal-input::placeholder { color: var(--portal-text-dim); }
        .portal-input:focus {
          border-color: var(--portal-accent);
          background: rgba(232,52,26,0.04);
        }
        .portal-submit {
          font-family: var(--portal-mono);
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #faf7f2;
          background: var(--portal-accent);
          border: 1px solid var(--portal-accent);
          border-radius: 4px;
          padding: 0.8rem 1.6rem;
          cursor: pointer;
          transition: opacity 0.2s ease, background 0.2s ease;
        }
        .portal-submit:hover:not(:disabled) { background: #ff3a1f; }
        .portal-submit:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      <div className="space-y-5">
        {/* Full name field */}
        <div>
          <label
            htmlFor="full-name"
            className="block"
            style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: PORTAL.muted, marginBottom: '0.7rem' }}
          >
            Nombre completo
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (saveState === 'success' || saveState === 'error') setSaveState('idle')
            }}
            placeholder="Tu nombre"
            maxLength={120}
            className="portal-input"
          />
        </div>

        {/* Save button + status */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={!isDirty || isPending} className="portal-submit">
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {saveState === 'success' && (
            <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#30d158' }}>
              Guardado correctamente.
            </span>
          )}
          {saveState === 'error' && errorMessage && (
            <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: PORTAL.accent }}>
              {errorMessage}
            </span>
          )}
        </div>
      </div>
    </form>
  )
}
