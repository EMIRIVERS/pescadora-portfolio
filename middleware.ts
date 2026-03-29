import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  // IMPORTANT: do not remove — refreshes session and sets cookies
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect /admin/*
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin_team')
      .eq('id', user.id)
      .single()

    if (error || !profile?.is_admin_team) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      url.searchParams.delete('redirectTo')
      return NextResponse.redirect(url)
    }
  }

  // Protect /portal/*
  if (pathname.startsWith('/portal')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from /login
  if (pathname === '/login' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin_team')
      .eq('id', user.id)
      .single()

    // No profile — let them stay on /login to sign out or retry
    if (!profile) return supabaseResponse

    const url = request.nextUrl.clone()
    url.pathname = profile.is_admin_team ? '/admin' : '/portal'
    url.searchParams.delete('redirectTo')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|glb|gltf)$).*)',
  ],
}
