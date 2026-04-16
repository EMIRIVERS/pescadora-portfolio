'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function updateClient(id: string, formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'El nombre es obligatorio.' }

  const { error } = await db.from('clients').update({
    name,
    email: String(formData.get('email') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${id}`)
  return {}
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  const db = createServiceClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/clients')
  return {}
}
