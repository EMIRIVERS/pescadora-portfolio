'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type FormMode = 'password' | 'magic-link'

function LoginPageInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<FormMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      // Fetch role and redirect
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Authentication failed. Please try again.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin_team')
        .eq('id', user.id)
        .single()

      const raw = searchParams.get('redirectTo')
      const safeRedirect = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
      const destination = safeRedirect ?? (profile?.is_admin_team ? '/admin' : '/portal')
      window.location.href = destination
    })
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (otpError) {
        setError(otpError.message)
        return
      }

      setMagicLinkSent(true)
    })
  }

  return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      {/* Subtle grain texture overlay */}
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
            Pescadora
          </span>
        </div>

        {/* Card */}
        <div className="border border-[#1a1a1a] rounded-sm bg-[#0d0d0d] p-8">
          {/* Mode toggle */}
          <div className="flex gap-1 mb-8 p-1 bg-[#111] rounded-sm">
            <button
              type="button"
              onClick={() => {
                setMode('password')
                setError(null)
                setMagicLinkSent(false)
              }}
              className={`flex-1 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors rounded-sm ${
                mode === 'password'
                  ? 'bg-[#1c1c1c] text-[#e8e8e8]'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('magic-link')
                setError(null)
                setMagicLinkSent(false)
              }}
              className={`flex-1 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors rounded-sm ${
                mode === 'magic-link'
                  ? 'bg-[#1c1c1c] text-[#e8e8e8]'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              Magic link
            </button>
          </div>

          {/* ── Password form ─────────────────────────────────────────────── */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} noValidate>
              <fieldset disabled={isPending} className="space-y-4">
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
                    className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
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
                    className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-[11px] font-mono text-red-400/80 pt-1">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-[#e8e8e8] hover:bg-white text-[#080808] text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Signing in...' : 'Sign in'}
                </button>
              </fieldset>
            </form>
          )}

          {/* ── Magic link form ───────────────────────────────────────────── */}
          {mode === 'magic-link' && !magicLinkSent && (
            <form onSubmit={handleMagicLink} noValidate>
              <fieldset disabled={isPending} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="email-magic"
                    className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#555]"
                  >
                    Email
                  </label>
                  <input
                    id="email-magic"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <p className="text-[11px] font-mono text-red-400/80 pt-1">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-[#e8e8e8] hover:bg-white text-[#080808] text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Sending...' : 'Send magic link'}
                </button>
              </fieldset>
            </form>
          )}

          {/* ── Magic link sent confirmation ──────────────────────────────── */}
          {mode === 'magic-link' && magicLinkSent && (
            <div className="text-center space-y-3 py-2">
              <p className="text-sm font-mono text-[#e8e8e8]">
                Link sent.
              </p>
              <p className="text-xs font-mono text-[#555] leading-relaxed">
                Check <span className="text-[#888]">{email}</span> for a sign-in
                link. It expires in 60 minutes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMagicLinkSent(false)
                  setEmail('')
                }}
                className="mt-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[#444] hover:text-[#888] transition-colors"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-center text-[10px] font-mono tracking-widest uppercase text-[#333]">
          Pescadora Platform &mdash; Private access
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
