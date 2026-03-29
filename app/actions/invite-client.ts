'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface InviteResult {
  success: boolean
  error?: string
}

export async function inviteClient(email: string): Promise<InviteResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Server configuration error.' }
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'client' },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
