'use client'

import { useRef, useState, useTransition } from 'react'
import { sendTestEmail } from '../../../actions/test-email'

interface Props {
  disabled?: boolean
}

export function TestEmailForm({ disabled = false }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setResult(null)
    startTransition(async () => {
      const res = await sendTestEmail(data)
      setResult(res)
      if (res.success) formRef.current?.reset()
    })
  }

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="email"
          name="to"
          placeholder="tu@email.com"
          required
          disabled={disabled || isPending}
          style={{
            flex: 1,
            minWidth: '200px',
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '9px 14px',
            fontSize: '14px',
            color: '#F5F5F7',
            outline: 'none',
            opacity: disabled ? 0.4 : 1,
          }}
        />
        <button
          type="submit"
          disabled={disabled || isPending}
          style={{
            backgroundColor: disabled || isPending ? '#1C1C1E' : '#0071E3',
            color: disabled || isPending ? '#48484A' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: disabled || isPending ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'background-color 0.15s ease',
          }}
        >
          {isPending ? 'Enviando...' : 'Enviar prueba'}
        </button>
      </form>

      {result?.success && (
        <p style={{ fontSize: '13px', color: '#30D158', margin: '10px 0 0' }}>
          Email enviado correctamente.
        </p>
      )}
      {result?.error && (
        <p style={{ fontSize: '13px', color: '#FF453A', margin: '10px 0 0' }}>
          Error: {result.error}
        </p>
      )}
    </div>
  )
}
