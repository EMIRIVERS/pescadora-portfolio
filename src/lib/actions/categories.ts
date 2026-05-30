'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'

export async function createCategory(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  const label = String(formData.get('label') ?? '').trim()
  if (!slug || !label) throw new Error('slug y label son obligatorios')

  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: max } = await (db as any)
    .from('portfolio_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sort_order = ((max as { sort_order: number } | null)?.sort_order ?? -1) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("portfolio_categories").insert({ slug, label, sort_order })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function updateCategory(
  oldSlug: string,
  data: { label?: string; slug?: string; sort_order?: number; is_visible?: boolean }
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (data.label !== undefined && !data.label.trim()) return { error: 'label es obligatorio' }
  const db = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('portfolio_categories').update(data).eq('slug', oldSlug)
  if (error) return { error: error.message }

  // If slug changed, cascade update to all videos in that category
  if (data.slug && data.slug !== oldSlug) {
    const { error: videoError } = await db
      .from('portfolio_videos')
      .update({ category: data.slug })
      .eq('category', oldSlug)
    if (videoError) return { error: videoError.message }
  }

  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  return {}
}

export async function deleteCategory(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("portfolio_categories").delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function toggleCategoryVisibility(id: string, is_visible: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("portfolio_categories").update({ is_visible }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function updateCategoryCover(slug: string, coverUrl: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('portfolio_categories')
    .update({ cover_url: coverUrl })
    .eq('slug', slug)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}

export async function reorderCategories(id: string, adjacentId: string, myOrder: number, adjacentOrder: number) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)
  const db = createServiceClient()
  await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('portfolio_categories').update({ sort_order: adjacentOrder }).eq('id', id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('portfolio_categories').update({ sort_order: myOrder }).eq('id', adjacentId),
  ])
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
}
