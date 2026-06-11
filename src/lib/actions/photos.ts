'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient, requireAdmin } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

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

export async function createAlbum(formData: FormData, parentId?: string | null): Promise<{
  id: string; slug: string; label: string; sort_order: number;
  is_visible: boolean; parent_id: string | null; cover_url: string | null; portfolio_photos: []
}> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const label = String(formData.get('label') ?? '').trim()
  if (!label) throw new Error('El nombre es obligatorio')
  const slug = toSlug(label)

  const db = createServiceClient()
  // Calculate next sort_order within the same parent scope
  let maxQuery = db
    .from('photo_albums')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  if (parentId) {
    maxQuery = maxQuery.eq('parent_id', parentId)
  } else {
    maxQuery = maxQuery.is('parent_id', null)
  }
  const { data: max } = await maxQuery.maybeSingle()
  const sort_order = (max?.sort_order ?? -1) + 1

  const { data: album, error } = await db.from('photo_albums').insert({
    slug,
    label,
    sort_order,
    parent_id: parentId ?? null,
  }).select('id, slug, label, sort_order, is_visible, parent_id, cover_url').single()
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'album.create',
    actorId: auth.userId,
    entityType: 'album',
    entityId: album.id,
    summary: `Álbum creado: ${label}`,
  })
  revalidatePath('/admin/portfolio')
  return { ...album, portfolio_photos: [] as [] }
}

export async function updateAlbum(
  id: string,
  data: { label?: string; is_visible?: boolean; sort_order?: number; cover_url?: string | null },
) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const db = createServiceClient()
  const { error } = await db.from('photo_albums').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'album.update',
    actorId: auth.userId,
    entityType: 'album',
    entityId: id,
    summary: 'Álbum actualizado',
  })
  revalidatePath('/admin/portfolio')
}

export async function deleteAlbum(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const db = createServiceClient()

  // Collect all album IDs to delete (this album + all sub-albums recursively)
  const { data: subAlbums } = await db
    .from('photo_albums')
    .select('id')
    .eq('parent_id', id)
  const albumIds = [id, ...(subAlbums ?? []).map((a) => a.id)]

  // Clean up storage files for all albums
  const { data: photos } = await db
    .from('portfolio_photos')
    .select('storage_path')
    .in('album_id', albumIds)
  if (photos && photos.length > 0) {
    const paths = photos
      .map((p) => p.storage_path)
      .filter((p) => p?.trim())
    if (paths.length > 0) await db.storage.from('media').remove(paths)
  }

  const { error } = await db.from('photo_albums').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'album.delete',
    actorId: auth.userId,
    entityType: 'album',
    entityId: id,
    summary: 'Álbum eliminado',
  })
  revalidatePath('/admin/portfolio')
}

export async function reorderAlbums(
  id: string,
  adjId: string,
  myOrder: number,
  adjOrder: number,
) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const db = createServiceClient()
  await Promise.all([
    db.from('photo_albums').update({ sort_order: adjOrder }).eq('id', id),
    db.from('photo_albums').update({ sort_order: myOrder }).eq('id', adjId),
  ])
  await logAudit({
    action: 'album.reorder',
    actorId: auth.userId,
    entityType: 'album',
    entityId: id,
    summary: 'Orden de álbumes actualizado',
    metadata: { adjId },
  })
  revalidatePath('/admin/portfolio')
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export async function addPhoto(
  albumId: string,
  storagePath: string,
  altText: string,
  sortOrder: number,
  url?: string,
): Promise<{ id: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const db = createServiceClient()
  const { data, error } = await db.from('portfolio_photos').insert({
    album_id: albumId,
    storage_path: storagePath,
    url: url ?? null,
    alt_text: altText,
    sort_order: sortOrder,
  }).select('id').single()
  if (error) throw new Error(error.message)
  const photoId = data.id
  await logAudit({
    action: 'photo.create',
    actorId: auth.userId,
    entityType: 'photo',
    entityId: photoId,
    summary: 'Foto agregada al álbum',
    metadata: { albumId },
  })
  revalidatePath('/admin/portfolio')
  return { id: photoId }
}

export async function deletePhoto(id: string, storagePath: string) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const db = createServiceClient()
  if (storagePath?.trim()) {
    await db.storage.from('media').remove([storagePath])
  }
  const { error } = await db.from('portfolio_photos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit({
    action: 'photo.delete',
    actorId: auth.userId,
    entityType: 'photo',
    entityId: id,
    summary: 'Foto eliminada',
  })
  revalidatePath('/admin/portfolio')
}

export async function reorderPhotos(updates: { id: string; sort_order: number }[]) {
  const auth = await requireAdmin()
  if ('error' in auth) throw new Error(auth.error)

  const db = createServiceClient()
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      db.from('portfolio_photos').update({ sort_order }).eq('id', id),
    ),
  )
  await logAudit({
    action: 'photo.reorder',
    actorId: auth.userId,
    entityType: 'photo',
    entityId: updates[0]?.id ?? null,
    summary: 'Orden de fotos actualizado',
  })
  revalidatePath('/admin/portfolio')
}
