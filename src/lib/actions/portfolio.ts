'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function parseVideoForm(formData: FormData) {
  const coverUrl = String(formData.get('cover_url') ?? '').trim()
  return {
    title: String(formData.get('title') ?? '').trim(),
    vimeo_id: String(formData.get('vimeo_id') ?? '').trim(),
    category: String(formData.get('category') ?? 'videoclips'),
    client_name: String(formData.get('client_name') ?? '').trim(),
    year: String(formData.get('year') ?? '').trim(),
    role: String(formData.get('role') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    sort_order: Number(formData.get('sort_order') ?? 0),
    // checkbox sends 'on' when checked, null when unchecked
    is_visible: formData.get('is_visible') !== null,
    cover_url: coverUrl.length > 0 ? coverUrl : null,
  }
}

export async function createPortfolioVideo(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').insert(parseVideoForm(formData))
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function updatePortfolioVideo(id: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('portfolio_videos')
    .update(parseVideoForm(formData))
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function deletePortfolioVideo(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function togglePortfolioVideoVisibility(id: string, is_visible: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').update({ is_visible }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}
