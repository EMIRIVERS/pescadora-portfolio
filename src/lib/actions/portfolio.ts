'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPortfolioVideo(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').insert({
    title: String(formData.get('title') ?? ''),
    vimeo_id: String(formData.get('vimeo_id') ?? ''),
    category: String(formData.get('category') ?? 'comercial'),
    client_name: String(formData.get('client_name') ?? ''),
    year: String(formData.get('year') ?? '2025'),
    role: String(formData.get('role') ?? ''),
    description: String(formData.get('description') ?? ''),
    sort_order: Number(formData.get('sort_order') ?? 0),
    is_visible: formData.get('is_visible') === 'true',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function updatePortfolioVideo(id: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('portfolio_videos').update({
    title: String(formData.get('title') ?? ''),
    vimeo_id: String(formData.get('vimeo_id') ?? ''),
    category: String(formData.get('category') ?? 'comercial'),
    client_name: String(formData.get('client_name') ?? ''),
    year: String(formData.get('year') ?? '2025'),
    role: String(formData.get('role') ?? ''),
    description: String(formData.get('description') ?? ''),
    sort_order: Number(formData.get('sort_order') ?? 0),
    is_visible: formData.get('is_visible') === 'true',
  }).eq('id', id)
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
