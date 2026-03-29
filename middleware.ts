import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do NOT remove, required for session persistence
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protect /admin/* ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin_team')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin_team) {
      // Logged in but not admin — send to portal to avoid redirect loop
      const portalUrl = request.nextUrl.clone()
      portalUrl.pathname = '/portal'
      portalUrl.searchParams.delete('redirectTo')
      return NextResponse.redirect(portalUrl)
    }
  }

  // ── Protect /portal/* ─────────────────────────────────────────────────────
  if (pathname.startsWith('/portal')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.delete('redirectTo')
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Post-login role-based redirect from /login ────────────────────────────
  if (pathname === '/login' && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')

    if (redirectTo) {
      const target = request.nextUrl.clone()
      target.pathname = redirectTo
      target.searchParams.delete('redirectTo')
      return NextResponse.redirect(target)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin_team')
      .eq('id', user.id)
      .single()

    const destination = request.nextUrl.clone()
    destination.pathname = profile?.is_admin_team ? '/admin' : '/portal'
    return NextResponse.redirect(destination)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|glb|gltf)$).*)',
  ],
}
