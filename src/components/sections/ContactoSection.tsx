'use client'
import { useState } from 'react'
import Image from 'next/image'

export function ContactoSection() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)

  const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    const text = encodeURIComponent(
      `Hola, soy ${nombre} (${email}).\n\n${mensaje}`
    )
    const url = `https://wa.me/${WA_NUMBER}?text=${text}`

    setTimeout(() => {
      window.open(url, '_blank')
      setSending(false)
      setNombre('')
      setEmail('')
      setMensaje('')
    }, 1500)
  }

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    padding: 'var(--space-2) 0',
    fontFamily: 'var(--font-geist-sans)',
    fontWeight: 300,
    fontSize: '1rem',
    color: 'var(--color-text)',
    outline: 'none',
    marginBottom: 'var(--space-4)',
    cursor: 'text',
  }

  return (
    <section
      id="contacto"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-8)',
          }}
        >
          Contacto
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            style={inputStyle}
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            aria-label="Nombre"
          />
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <textarea
            style={{ ...inputStyle, resize: 'none', minHeight: '80px' }}
            placeholder="Mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            required
            aria-label="Mensaje"
          />

          <button
            type="submit"
            disabled={sending}
            data-cursor="link"
            style={{
              marginTop: 'var(--space-2)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--color-text)',
              cursor: 'none',
              padding: '0.9rem 2.5rem',
              transition: 'opacity 0.2s, border-color 0.3s',
              opacity: sending ? 0.5 : 1,
            }}
          >
            {sending ? 'Abriendo WhatsApp...' : 'Enviar'}
          </button>
        </form>

        {/* Footer with fish logo */}
        <div
          style={{
            marginTop: 'var(--space-12)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              color: 'var(--color-text-muted)',
            }}
          >
            @pescadora
          </p>
          <Image
            src="/fish_silhouette.png"
            alt="Pescadora"
            width={28}
            height={16}
            style={{ opacity: 0.4 }}
          />
        </div>
      </div>
    </section>
  )
}
