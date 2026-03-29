'use client'

import { useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

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
        // Reset dirty state by syncing initialFullName equivalent
        setTimeout(() => setSaveState('idle'), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">
        {/* Full name field */}
        <div>
          <label
            htmlFor="full-name"
            className="block text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2"
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
            className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 transition-all"
          />
        </div>

        {/* Save button + status */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!isDirty || isPending}
            className="text-sm font-medium px-5 py-2 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>

          {saveState === 'success' && (
            <span className="text-emerald-400 text-xs">Guardado correctamente.</span>
          )}
          {saveState === 'error' && errorMessage && (
            <span className="text-red-400 text-xs">{errorMessage}</span>
          )}
        </div>
      </div>
    </form>
  )
}
