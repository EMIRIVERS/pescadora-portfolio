'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ─── Albums ───────────────────────────────────────────────────────────────────

export async function createAlbum(formData: FormData) {
  const label = String(formData.get('label') ?? '').trim()
  if (!label) throw new Error('El nombre es obligatorio')
  const slug = toSlug(label)

  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: max } = await (db as any)
    .from('photo_albums')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const sort_order = ((max as { sort_order: number } | null)?.sort_order ?? -1) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('photo_albums').insert({ slug, label, sort_order })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
}

export async function updateAlbum(
  id: string,
  data: { label?: string; is_visible?: boolean; sort_order?: number },
) {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('photo_albums').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
}

export async function deleteAlbum(id: string) {
  const db = createServiceClient()

  // Clean up storage files first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: photos } = await (db as any)
    .from('portfolio_photos')
    .select('storage_path')
    .eq('album_id', id)
  if (photos && photos.length > 0) {
    await db.storage
      .from('media')
      .remove((photos as { storage_path: string }[]).map((p) => p.storage_path))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('photo_albums').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
}

export async function reorderAlbums(
  id: string,
  adjId: string,
  myOrder: number,
  adjOrder: number,
) {
  const db = createServiceClient()
  await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('photo_albums').update({ sort_order: adjOrder }).eq('id', id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('photo_albums').update({ sort_order: myOrder }).eq('id', adjId),
  ])
  revalidatePath('/admin/portfolio')
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export async function addPhoto(
  albumId: string,
  storagePath: string,
  altText: string,
  sortOrder: number,
  url?: string,
) {
  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('portfolio_photos').insert({
    album_id: albumId,
    storage_path: storagePath,
    url: url ?? null,
    alt_text: altText,
    sort_order: sortOrder,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
}

export async function deletePhoto(id: string, storagePath: string) {
  const db = createServiceClient()
  await db.storage.from('media').remove([storagePath])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('portfolio_photos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/portfolio')
}

export async function reorderPhotos(updates: { id: string; sort_order: number }[]) {
  const db = createServiceClient()
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from('portfolio_photos').update({ sort_order }).eq('id', id),
    ),
  )
  revalidatePath('/admin/portfolio')
}
