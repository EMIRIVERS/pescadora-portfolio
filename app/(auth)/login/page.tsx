'use client'

import { Suspense, useState, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signInWithPassword, signInWithMagicLink } from '../../actions/auth'

type FormMode = 'password' | 'magic-link'

function LoginPageInner() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const [mode, setMode] = useState<FormMode>('password')

  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    { error: null },
  )

  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLink,
    { error: null, sent: false },
  )

  const switchMode = (next: FormMode) => {
    setMode(next)
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
            Pescadora
          </span>
        </div>

        {/* Card */}
        <div className="border border-[#1a1a1a] rounded-sm bg-[#0d0d0d] p-8">
          {/* Mode toggle */}
          <div className="flex gap-1 mb-8 p-1 bg-[#111] rounded-sm">
            <button
              type="button"
              onClick={() => switchMode('password')}
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
              onClick={() => switchMode('magic-link')}
              className={`flex-1 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors rounded-sm ${
                mode === 'magic-link'
                  ? 'bg-[#1c1c1c] text-[#e8e8e8]'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              Magic link
            </button>
          </div>

          {/* ── Password form ── */}
          {mode === 'password' && (
            <form action={passwordAction} noValidate>
              {redirectTo && (
                <input type="hidden" name="redirectTo" value={redirectTo} />
              )}
              <fieldset disabled={passwordPending} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#555]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
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
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {passwordState.error && (
                  <p className="text-[11px] font-mono text-red-400/80 pt-1">
                    {passwordState.error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-[#e8e8e8] hover:bg-white text-[#080808] text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {passwordPending ? 'Signing in...' : 'Sign in'}
                </button>
              </fieldset>
            </form>
          )}

          {/* ── Magic link form ── */}
          {mode === 'magic-link' && !magicState.sent && (
            <form action={magicAction} noValidate>
              <fieldset disabled={magicPending} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="email-magic"
                    className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#555]"
                  >
                    Email
                  </label>
                  <input
                    id="email-magic"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full bg-[#111] border border-[#222] rounded-sm px-3 py-2.5 text-sm text-[#e8e8e8] font-mono placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {magicState.error && (
                  <p className="text-[11px] font-mono text-red-400/80 pt-1">
                    {magicState.error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-[#e8e8e8] hover:bg-white text-[#080808] text-xs font-mono tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {magicPending ? 'Sending...' : 'Send magic link'}
                </button>
              </fieldset>
            </form>
          )}

          {/* ── Magic link sent ── */}
          {mode === 'magic-link' && magicState.sent && (
            <div className="text-center space-y-3 py-2">
              <p className="text-sm font-mono text-[#e8e8e8]">Link sent.</p>
              <p className="text-xs font-mono text-[#555] leading-relaxed">
                Revisa tu email. El link expira en 60 minutos.
              </p>
              <button
                type="button"
                onClick={() => switchMode('magic-link')}
                className="mt-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[#444] hover:text-[#888] transition-colors"
              >
                Usar otro email
              </button>
            </div>
          )}
        </div>

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
