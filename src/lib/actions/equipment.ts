'use server'

// Inventario de equipo de producción (tabla public.production_equipment).
// Migración: supabase/migrations/20260618000000_business_expenses_equipment.sql

import { revalidatePath } from 'next/cache'
import { createServiceClient, requireRole } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type {
  ProductionEquipment,
  EquipmentCategory,
  EquipmentStatus,
  Json,
} from '@/lib/supabase/types'

export interface EquipmentInput {
  name: string
  brand: string | null
  model: string | null
  category: EquipmentCategory
  status: EquipmentStatus
  condition: string | null
  serialNumber: string | null
  quantity: number
  purchaseDate: string | null
  purchaseCost: number | null
  currency: string
  location: string | null
  imageUrl: string | null
  specs: Json
  notes: string | null
}

export async function getEquipment(): Promise<ProductionEquipment[]> {
  const auth = await requireRole('equipment', 'view')
  if ('error' in auth) return []
  const db = createServiceClient()
  const { data } = await db
    .from('production_equipment')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })
  return (data ?? []) as ProductionEquipment[]
}

export async function createEquipment(
  input: EquipmentInput,
): Promise<{ data?: ProductionEquipment; error?: string }> {
  const auth = await requireRole('equipment', 'create')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { data, error } = await db
    .from('production_equipment')
    .insert({
      name: input.name,
      brand: input.brand,
      model: input.model,
      category: input.category,
      status: input.status,
      condition: input.condition,
      serial_number: input.serialNumber,
      quantity: input.quantity,
      purchase_date: input.purchaseDate,
      purchase_cost: input.purchaseCost,
      currency: input.currency,
      location: input.location,
      image_url: input.imageUrl,
      specs: input.specs,
      notes: input.notes,
    })
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'No se pudo registrar el equipo.' }

  await logAudit({
    action: 'equipment.create',
    actorId: auth.userId,
    entityType: 'equipment',
    entityId: data.id,
    summary: `Equipo agregado: ${input.name}`,
  })

  revalidatePath('/admin/inventario')
  return { data }
}

export async function updateEquipment(
  id: string,
  input: EquipmentInput,
): Promise<{ data?: ProductionEquipment; error?: string }> {
  const auth = await requireRole('equipment', 'update')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { data, error } = await db
    .from('production_equipment')
    .update({
      name: input.name,
      brand: input.brand,
      model: input.model,
      category: input.category,
      status: input.status,
      condition: input.condition,
      serial_number: input.serialNumber,
      quantity: input.quantity,
      purchase_date: input.purchaseDate,
      purchase_cost: input.purchaseCost,
      currency: input.currency,
      location: input.location,
      image_url: input.imageUrl,
      specs: input.specs,
      notes: input.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'No se pudo actualizar el equipo.' }

  await logAudit({
    action: 'equipment.update',
    actorId: auth.userId,
    entityType: 'equipment',
    entityId: id,
    summary: `Equipo actualizado: ${input.name}`,
  })

  revalidatePath('/admin/inventario')
  return { data }
}

export async function deleteEquipment(id: string): Promise<{ error?: string }> {
  const auth = await requireRole('equipment', 'delete')
  if ('error' in auth) return { error: auth.error }
  const db = createServiceClient()
  const { error } = await db.from('production_equipment').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit({
    action: 'equipment.delete',
    actorId: auth.userId,
    entityType: 'equipment',
    entityId: id,
    summary: 'Equipo eliminado',
  })
  revalidatePath('/admin/inventario')
  return {}
}
