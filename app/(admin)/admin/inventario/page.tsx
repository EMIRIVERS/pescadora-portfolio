import { createServiceClient } from '@/lib/supabase/server'
import type { ProductionEquipment } from '@/lib/supabase/types'
import InventarioClient from './InventarioClient'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export default async function InventarioPage() {
  const db = createServiceClient()
  const { data: equipmentRaw } = await db
    .from('production_equipment')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const equipment = (equipmentRaw ?? []) as ProductionEquipment[]

  const totalUnits = equipment.reduce((s, e) => s + (e.quantity ?? 1), 0)
  const available = equipment.filter((e) => e.status === 'available').length
  const maintenance = equipment.filter((e) => e.status === 'maintenance').length
  const totalValue = equipment.reduce((s, e) => s + Number(e.purchase_cost ?? 0) * (e.quantity ?? 1), 0)

  function fmt(n: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
  }

  const stats: { label: string; value: string; color: string }[] = [
    { label: 'Equipos', value: equipment.length.toString(), color: 'var(--dash-accent)' },
    { label: 'Unidades', value: totalUnits.toString(), color: 'var(--dash-text-secondary)' },
    { label: 'Disponibles', value: available.toString(), color: 'var(--dash-success)' },
    { label: 'En mantenimiento', value: maintenance.toString(), color: 'var(--dash-warning)' },
    { label: 'Valor estimado', value: fmt(totalValue), color: 'var(--dash-text-secondary)' },
  ]

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>
          Inventario de equipo
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--dash-text-secondary)' }}>
          Todo el equipo de producción: cámaras, lentes, iluminación, audio y más
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: '1 1 130px',
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderTop: `2px solid ${s.color}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--dash-text-secondary)', fontFamily: FONT }}>{s.label}</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em', fontFamily: FONT }}>{s.value}</p>
          </div>
        ))}
      </div>

      <InventarioClient initialEquipment={equipment} />
    </div>
  )
}
