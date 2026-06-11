/**
 * src/lib/billing/catalog.ts
 *
 * Catálogo de servicios audiovisuales de XICO Films + motor de sugerencias.
 * Replica la mecánica del block-catalog de 1640, adaptada al giro de cine/video.
 *
 * Los precios son PLACEHOLDER — ajústalos al tabulador real de XICO.
 * El catálogo es la única fuente de verdad de servicios; las cotizaciones y
 * facturas guardan una copia de cada línea (snapshot) para no romperse si el
 * catálogo cambia después.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type ServiceCategory =
  // Preproducción
  | 'CONCEPTO'
  | 'GUION'
  | 'SCOUTING'
  | 'CASTING'
  // Producción
  | 'DIRECCION'
  | 'FOTOGRAFIA'
  | 'DIA_RODAJE'
  | 'FOTO_FIJA'
  | 'DRONE'
  | 'SONIDO_DIRECTO'
  | 'ILUMINACION'
  // Postproducción
  | 'EDICION'
  | 'COLOR'
  | 'MOTION'
  | 'SOUND_DESIGN'
  | 'SUBTITULOS'
  // Logística
  | 'RENTA_EQUIPO'
  | 'TRANSPORTE'
  | 'CATERING'
  | 'LOCACION'
  // Administración
  | 'FEE_PRODUCCION'
  | 'ANTICIPO'

export type ServiceGroup =
  | 'PREPRODUCCION'
  | 'PRODUCCION'
  | 'POSTPRODUCCION'
  | 'LOGISTICA'
  | 'ADMINISTRACION'

export type ServiceUnit =
  | 'hora'
  | 'dia'
  | 'jornada'
  | 'proyecto'
  | 'pieza'
  | 'video'
  | 'evento'

/** Línea de una cotización/factura. Snapshot del catálogo + cantidad. */
export interface QuoteLine {
  id: string
  category: ServiceCategory
  /** Nombre mostrado y guardado (description en proposals/invoices). */
  name: string
  description?: string
  unitPrice: number
  qty: number
  unit: ServiceUnit
  /** Bloque obligatorio que no se puede eliminar (lo agrega el motor). */
  isRequired?: boolean
}

export interface CatalogEntry {
  category: ServiceCategory
  label: string
  description: string
  defaultPrice: number
  unit: ServiceUnit
  group: ServiceGroup
}

// ── Catálogo ────────────────────────────────────────────────────────────────────

export const SERVICE_CATALOG: CatalogEntry[] = [
  // ── Preproducción ──
  { category: 'CONCEPTO', label: 'Concepto / Tratamiento', description: 'Desarrollo creativo, tratamiento visual y moodboard', defaultPrice: 8000, unit: 'proyecto', group: 'PREPRODUCCION' },
  { category: 'GUION', label: 'Guion / Storyboard', description: 'Guion, storyboard y desglose de planos', defaultPrice: 6000, unit: 'proyecto', group: 'PREPRODUCCION' },
  { category: 'SCOUTING', label: 'Scouting de Locaciones', description: 'Búsqueda y registro fotográfico de locaciones', defaultPrice: 3500, unit: 'dia', group: 'PREPRODUCCION' },
  { category: 'CASTING', label: 'Casting', description: 'Convocatoria, audiciones y selección de talento', defaultPrice: 4000, unit: 'proyecto', group: 'PREPRODUCCION' },

  // ── Producción ──
  { category: 'DIRECCION', label: 'Dirección', description: 'Dirección creativa en set', defaultPrice: 12000, unit: 'jornada', group: 'PRODUCCION' },
  { category: 'FOTOGRAFIA', label: 'Dirección de Fotografía', description: 'DoP / operación de cámara con equipo base', defaultPrice: 10000, unit: 'jornada', group: 'PRODUCCION' },
  { category: 'DIA_RODAJE', label: 'Día de Rodaje', description: 'Jornada de producción con crew base', defaultPrice: 15000, unit: 'jornada', group: 'PRODUCCION' },
  { category: 'FOTO_FIJA', label: 'Fotografía Fija', description: 'Cobertura fotográfica del proyecto', defaultPrice: 6000, unit: 'jornada', group: 'PRODUCCION' },
  { category: 'DRONE', label: 'Tomas Aéreas / Drone', description: 'Operación de dron con piloto certificado', defaultPrice: 5000, unit: 'jornada', group: 'PRODUCCION' },
  { category: 'SONIDO_DIRECTO', label: 'Sonido Directo', description: 'Captura de audio en set con sonidista', defaultPrice: 4500, unit: 'jornada', group: 'PRODUCCION' },
  { category: 'ILUMINACION', label: 'Iluminación / Gaffer', description: 'Diseño de iluminación y crew de luces', defaultPrice: 5000, unit: 'jornada', group: 'PRODUCCION' },

  // ── Postproducción ──
  { category: 'EDICION', label: 'Edición / Montaje', description: 'Montaje y armado del corte final', defaultPrice: 12000, unit: 'video', group: 'POSTPRODUCCION' },
  { category: 'COLOR', label: 'Corrección de Color', description: 'Color grading profesional', defaultPrice: 6000, unit: 'video', group: 'POSTPRODUCCION' },
  { category: 'MOTION', label: 'Motion Graphics', description: 'Animación, gráficos y títulos', defaultPrice: 8000, unit: 'proyecto', group: 'POSTPRODUCCION' },
  { category: 'SOUND_DESIGN', label: 'Diseño Sonoro / Mezcla', description: 'Diseño de audio, foley y mezcla final', defaultPrice: 5000, unit: 'video', group: 'POSTPRODUCCION' },
  { category: 'SUBTITULOS', label: 'Subtítulos / Versiones', description: 'Subtitulaje y exportación de versiones/formatos', defaultPrice: 1500, unit: 'video', group: 'POSTPRODUCCION' },

  // ── Logística ──
  { category: 'RENTA_EQUIPO', label: 'Renta de Equipo', description: 'Cámara, lentes, grip e iluminación adicional', defaultPrice: 4000, unit: 'dia', group: 'LOGISTICA' },
  { category: 'TRANSPORTE', label: 'Transporte', description: 'Traslado de crew y equipo', defaultPrice: 2500, unit: 'dia', group: 'LOGISTICA' },
  { category: 'CATERING', label: 'Catering / Craft', description: 'Alimentos y bebidas para el crew', defaultPrice: 3000, unit: 'dia', group: 'LOGISTICA' },
  { category: 'LOCACION', label: 'Renta de Locación', description: 'Permiso y renta del espacio de rodaje', defaultPrice: 5000, unit: 'dia', group: 'LOGISTICA' },

  // ── Administración ──
  { category: 'FEE_PRODUCCION', label: 'Fee de Producción', description: 'Coordinación, gestión y supervisión del proyecto', defaultPrice: 5000, unit: 'proyecto', group: 'ADMINISTRACION' },
  { category: 'ANTICIPO', label: 'Anticipo / Retainer', description: 'Pago inicial para reservar fechas', defaultPrice: 0, unit: 'proyecto', group: 'ADMINISTRACION' },
]

export const GROUP_ORDER: ServiceGroup[] = [
  'PREPRODUCCION',
  'PRODUCCION',
  'POSTPRODUCCION',
  'LOGISTICA',
  'ADMINISTRACION',
]

export const GROUP_LABELS: Record<ServiceGroup, string> = {
  PREPRODUCCION: 'Preproducción',
  PRODUCCION: 'Producción',
  POSTPRODUCCION: 'Postproducción',
  LOGISTICA: 'Logística',
  ADMINISTRACION: 'Administración',
}

export const UNIT_LABELS: Record<ServiceUnit, string> = {
  hora: 'hora',
  dia: 'día',
  jornada: 'jornada',
  proyecto: 'proyecto',
  pieza: 'pieza',
  video: 'video',
  evento: 'evento',
}

// ── Tipo de cliente (CFDI) ──────────────────────────────────────────────────────

export type ClientType = 'DIRECTO' | 'EMPRESA'

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  DIRECTO: 'Cliente directo',
  EMPRESA: 'Empresa / B2B',
}

/** Datos fiscales del receptor (CFDI 4.0). Solo se piden a EMPRESA. */
export interface FiscalData {
  rfc: string
  razonSocial: string
  usoCfdi: string
  regimenFiscal?: string
  codigoPostal?: string
  emailFacturacion: string
}

// ── Motor de sugerencias ────────────────────────────────────────────────────────

/**
 * A partir de las líneas activas, retorna:
 * - suggestions: categorías recomendadas que conviene agregar (aún no están)
 * - requiredAdditions: categorías que deberían agregarse automáticamente
 *
 * Reglas audiovisuales (paquetes típicos de XICO):
 *   - DoP sin Día de Rodaje → sugiere Día de Rodaje
 *   - Día de Rodaje → sugiere Edición
 *   - Edición → sugiere Color
 *   - Color → sugiere Sound Design
 *   - Cualquier producción → sugiere Fee de Producción
 */
export function getSuggestions(active: QuoteLine[]): {
  suggestions: ServiceCategory[]
  requiredAdditions: ServiceCategory[]
} {
  const has = new Set(active.map((l) => l.category))
  const suggestions: ServiceCategory[] = []
  const requiredAdditions: ServiceCategory[] = []

  const add = (cat: ServiceCategory) => {
    if (!has.has(cat) && !suggestions.includes(cat)) suggestions.push(cat)
  }

  if (has.has('FOTOGRAFIA') && !has.has('DIA_RODAJE')) add('DIA_RODAJE')
  if (has.has('DIA_RODAJE') && !has.has('EDICION')) add('EDICION')
  if (has.has('EDICION') && !has.has('COLOR')) add('COLOR')
  if (has.has('COLOR') && !has.has('SOUND_DESIGN')) add('SOUND_DESIGN')

  const PRODUCCION_CATS: ServiceCategory[] = [
    'DIRECCION',
    'FOTOGRAFIA',
    'DIA_RODAJE',
    'FOTO_FIJA',
    'DRONE',
  ]
  const hasProduccion = PRODUCCION_CATS.some((c) => has.has(c))
  if (hasProduccion && !has.has('FEE_PRODUCCION')) add('FEE_PRODUCCION')

  return { suggestions, requiredAdditions }
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

export function findEntry(category: ServiceCategory): CatalogEntry | undefined {
  return SERVICE_CATALOG.find((e) => e.category === category)
}

export function generateLineId(): string {
  return `LIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

/** Crea una QuoteLine desde el catálogo con cantidad 1. */
export function lineFromCatalog(
  entry: CatalogEntry,
  overrides?: Partial<QuoteLine>,
): QuoteLine {
  return {
    id: generateLineId(),
    category: entry.category,
    name: entry.label,
    description: entry.description,
    unitPrice: entry.defaultPrice,
    qty: 1,
    unit: entry.unit,
    ...overrides,
  }
}
