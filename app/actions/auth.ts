'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function signInWithPassword(
  _prevState: { error: string | null; redirectTo?: string },
  formData: FormData,
): Promise<{ error: string | null; redirectTo?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Authentication failed. Please try again.' }
  }

  // Use service client to bypass RLS — identity already verified above
  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin_team')
    .eq('id', user.id)
    .single()

  return { error: null, redirectTo: profile?.is_admin_team ? '/admin' : '/portal' }
}

export async function signInWithMagicLink(
  _prevState: { error: string | null; sent: boolean },
  formData: FormData,
): Promise<{ error: string | null; sent: boolean }> {
  const email = formData.get('email') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    return { error: error.message, sent: false }
  }

  return { error: null, sent: true }
}
