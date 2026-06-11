'use server'

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notify'

// Simple in-memory rate limit per IP. NOTE: the Map lives per lambda/server
// instance, so the limit is not global across instances — imperfect, but good
// enough as a first barrier against form spam bursts.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 5
const submissionsByIp = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()

  // Evict stale entries so the Map doesn't grow unbounded.
  for (const [key, timestamps] of submissionsByIp) {
    const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (fresh.length === 0) submissionsByIp.delete(key)
    else submissionsByIp.set(key, fresh)
  }

  const recent = submissionsByIp.get(ip) ?? []
  if (recent.length >= RATE_LIMIT_MAX) return true

  recent.push(now)
  submissionsByIp.set(ip, recent)
  return false
}

export async function submitCotizacion(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  // Honeypot: hidden field that humans never fill. If a bot fills it, return a
  // silent "success" without inserting anything.
  const honeypot = (formData.get('website') as string | null)?.trim() ?? ''
  if (honeypot) {
    return { success: true }
  }

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return { error: 'Demasiados envios. Espera un momento e intentalo de nuevo.' }
  }

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

  // Length caps on this public, unauthenticated endpoint to prevent abusive
  // oversized payloads.
  if (
    name.length > 120 ||
    email.length > 200 ||
    phone.length > 40 ||
    company.length > 150 ||
    project_type.length > 100 ||
    budget_range.length > 100 ||
    message.length > 4000
  ) {
    return { error: 'Uno o mas campos exceden la longitud permitida.' }
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

  await notify({
    title: 'Nueva solicitud de cotización',
    body: `${name}${company ? ` (${company})` : ''} solicitó una cotización${project_type ? ` — ${project_type}` : ''}.`,
    type: 'info',
    entityType: 'lead',
    email: true,
  })

  return { success: true }
}
