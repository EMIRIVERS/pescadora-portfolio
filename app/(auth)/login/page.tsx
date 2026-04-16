'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function LoginPageInner() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, setPending]   = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setPending(false)
      return
    }

    // Cookies are already in the browser — let middleware decide the destination
    window.location.href = '/admin'
  }

  return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-12 text-center">
          <span className="font-mono text-xs tracking-[0.4em] text-[#888] uppercase">
            Carajo Films
          </span>
        </div>

        {/* Card */}
        <div className="border border-[#1a1a1a] rounded-sm bg-[#0d0d0d] p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#555]"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors disabled:opacity-40"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#555]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors disabled:opacity-40"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-[11px] font-mono text-red-400/80 pt-1">
                  {error === 'Invalid login credentials'
                    ? 'Email o contraseña incorrectos.'
                    : error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full mt-2 py-2.5 bg-[#e8e8e8] hover:bg-white text-[#080808] text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] font-mono tracking-widest uppercase text-[#333]">
          Carajo Films Platform &mdash; Private access
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
