import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

/**
 * Creates a Supabase client bound to the middleware request/response cookie
 * pair. Returns both the client and the mutable response so the caller can
 * forward updated Set-Cookie headers to the browser.
 *
 * Usage:
 *   const { supabase, response } = createMiddlewareClient(request)
 *   const { data: { user } } = await supabase.auth.getUser()
 *   return response
 */
export function createMiddlewareClient(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient<Database>>
  response: NextResponse
} {
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response }
}
