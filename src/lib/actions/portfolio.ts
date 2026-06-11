'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const CAP = (s: string, n: number) => s.slice(0, n)

function parseVideoForm(formData: FormData) {
  const coverUrl = CAP(String(formData.get('cover_url') ?? '').trim(), 500)
  return {
    title: CAP(String(formData.get('title') ?? '').trim(), 200),
    vimeo_id: CAP(String(formData.get('vimeo_id') ?? '').trim(), 50),
    category: CAP(String(formData.get('category') ?? 'videoclips'), 50),
    client_name: CAP(String(formData.get('client_name') ?? '').trim(), 200),
    year: CAP(String(formData.get('year') ?? '').trim(), 10),
    role: CAP(String(formData.get('role') ?? '').trim(), 200),
    description: CAP(String(formData.get('description') ?? '').trim(), 2000),
    sort_order: Number(formData.get('sort_order') ?? 0),
    // checkbox sends 'on' when checked, null when unchecked
    is_visible: formData.get('is_visible') !== null,
    cover_url: coverUrl.length > 0 ? coverUrl : null,
  }
}

export async function createPortfolioVideo(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').insert(parseVideoForm(formData))
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'portfolio.create',
    actorId: auth.userId,
    entityType: 'portfolio',
    entityId: null,
    summary: 'Video de portafolio creado',
  })
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function updatePortfolioVideo(id: string, formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const supabase = await createClient()
  const { error } = await supabase
    .from('portfolio_videos')
    .update(parseVideoForm(formData))
    .eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'portfolio.update',
    actorId: auth.userId,
    entityType: 'portfolio',
    entityId: id,
    summary: 'Video de portafolio actualizado',
  })
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function deletePortfolioVideo(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'portfolio.delete',
    actorId: auth.userId,
    entityType: 'portfolio',
    entityId: id,
    summary: 'Video de portafolio eliminado',
  })
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function togglePortfolioVideoVisibility(id: string, is_visible: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').update({ is_visible }).eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'portfolio.update',
    actorId: auth.userId,
    entityType: 'portfolio',
    entityId: id,
    summary: is_visible ? 'Video de portafolio mostrado' : 'Video de portafolio ocultado',
  })
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}
