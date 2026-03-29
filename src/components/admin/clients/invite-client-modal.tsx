'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { inviteClient } from '../../../../app/actions/invite-client'
import { X, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

interface FormValues {
  name: string
  email: string
  company: string
}

interface FormErrors {
  name?: string
  email?: string
  general?: string
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Name is required.'
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  return errors
}

const DEFAULT_VALUES: FormValues = {
  name: '',
  email: '',
  company: '',
}

export function InviteClientModal({ onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !isPending) {
      onClose()
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validationErrors = validate(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const supabase = createClient()

      // 1. Insert the client record
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          name: values.name.trim(),
          email: values.email.trim(),
          company: values.company.trim() || null,
        })

      if (insertError) {
        setErrors({ general: insertError.message })
        return
      }

      // 2. Send magic link invite via server action (requires service role)
      const result = await inviteClient(values.email.trim())

      if (!result.success) {
        setErrors({ general: result.error ?? 'Failed to send invite.' })
        return
      }

      setSuccessEmail(values.email.trim())
    })
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="Invite client"
    >
      <div className="relative w-full max-w-md mx-4 bg-[#0d0d0d] border border-[#2a2a2a] rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a]">
          <h2 className="text-xs font-mono tracking-[0.2em] uppercase text-[#e8e8e8]">
            Invitar cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-sm text-[#555] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {successEmail ? (
            <div className="space-y-4">
              <div className="rounded-sm bg-emerald-950/30 border border-emerald-900/40 px-4 py-4">
                <p className="text-xs font-mono text-emerald-400 leading-relaxed">
                  Invitacion enviada a{' '}
                  <span className="text-emerald-300">{successEmail}</span>
                </p>
                <p className="text-[10px] font-mono text-[#555] mt-1.5">
                  El cliente recibira un enlace para acceder al portal.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono tracking-[0.1em] rounded-sm bg-[#1a1a1a] hover:bg-[#222] text-[#aaa] hover:text-[#e8e8e8] border border-[#2a2a2a] transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {errors.general && (
                <div className="rounded-sm bg-red-950/30 border border-red-900/40 px-4 py-3 text-xs font-mono text-red-400">
                  {errors.general}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ic-name"
                  className="block text-[10px] font-mono tracking-[0.15em] uppercase text-[#555]"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="ic-name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  disabled={isPending}
                  autoComplete="off"
                  className="w-full rounded-sm bg-[#111] border border-[#2a2a2a] px-3 py-2.5 text-sm font-mono text-[#e8e8e8] placeholder-[#333] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555]/30 disabled:opacity-50 transition-colors"
                  placeholder="Ana Garcia"
                />
                {errors.name && (
                  <p className="text-[10px] font-mono text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ic-email"
                  className="block text-[10px] font-mono tracking-[0.15em] uppercase text-[#555]"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="ic-email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  disabled={isPending}
                  autoComplete="off"
                  className="w-full rounded-sm bg-[#111] border border-[#2a2a2a] px-3 py-2.5 text-sm font-mono text-[#e8e8e8] placeholder-[#333] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555]/30 disabled:opacity-50 transition-colors"
                  placeholder="ana@cliente.com"
                />
                {errors.email && (
                  <p className="text-[10px] font-mono text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ic-company"
                  className="block text-[10px] font-mono tracking-[0.15em] uppercase text-[#555]"
                >
                  Empresa
                </label>
                <input
                  id="ic-company"
                  name="company"
                  type="text"
                  value={values.company}
                  onChange={handleChange}
                  disabled={isPending}
                  autoComplete="off"
                  className="w-full rounded-sm bg-[#111] border border-[#2a2a2a] px-3 py-2.5 text-sm font-mono text-[#e8e8e8] placeholder-[#333] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555]/30 disabled:opacity-50 transition-colors"
                  placeholder="Opcional"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-mono tracking-[0.1em] rounded-sm bg-[#111] hover:bg-[#1a1a1a] text-[#666] hover:text-[#aaa] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-[0.1em] uppercase rounded-sm bg-[#e8e8e8] hover:bg-white text-[#0d0d0d] font-medium transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Enviar invitacion
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
