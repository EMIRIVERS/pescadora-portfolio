'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function submitCotizacion(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const name         = (formData.get('name')         as string | null)?.trim() ?? ''
  const email        = (formData.get('email')        as string | null)?.trim() ?? ''
  const phone        = (formData.get('phone')        as string | null)?.trim() ?? ''
  const company      = (formData.get('company')      as string | null)?.trim() ?? ''
  const project_type = (formData.get('project_type') as string | null)?.trim() ?? ''
  const budget_range = (formData.get('budget_range') as string | null)?.trim() ?? ''
  const message      = (formData.get('message')      as string | null)?.trim() ?? ''

  if (!name) {
    return { error: 'El nombre es requerido.' }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Ingresa un email valido.' }
  }

  const service = createServiceClient()

  const { error: dbError } = await service.from('leads').insert({
    name,
    email,
    phone:        phone        || null,
    company:      company      || null,
    project_type: project_type || null,
    budget_range: budget_range || null,
    notes:        message      || null,
    status:       'new',
    source:       'web',
  })

  if (dbError) {
    console.error('[cotiza] insert error:', dbError.message)
    return { error: 'Algo salio mal. Intentalo de nuevo o escribenos directamente.' }
  }

  return { success: true }
}
