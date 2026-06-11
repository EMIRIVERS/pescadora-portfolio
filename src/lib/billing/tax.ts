/**
 * src/lib/billing/tax.ts
 *
 * Única fuente de cálculo fiscal (CFDI MX) para cotizaciones y facturas.
 * Portado del módulo de 1640, adaptado a TypeScript strict.
 *
 * Tasas de referencia SAT México (2026):
 *   IVA trasladado:   16 %
 *   Retención ISR:    10 %       (servicios profesionales)
 *   Retención IVA:    10.666 %   (2/3 del IVA, personas físicas)
 */

// ── Interfaces públicas ────────────────────────────────────────────────────────

/**
 * Desglose fiscal CFDI 4.0.
 * `retIsr` y `retIva` quedan undefined cuando no aplican retenciones
 * (clientes personas morales, cotizaciones simples, etc.).
 * El campo `total` ya incorpora la resta de retenciones:
 *   total = subtotal + iva − (retIsr ?? 0) − (retIva ?? 0)
 */
export interface TaxBreakdown {
  subtotal: number
  iva: number // IVA trasladado (16 % por defecto)
  retIsr?: number // Retención ISR  (10 % sobre subtotal)
  retIva?: number // Retención IVA  (10.666 % sobre subtotal)
  total: number // Monto neto a cobrar / pagar
}

/**
 * Opciones para `calcTaxBreakdown`. Todos los campos son opcionales;
 * los valores por defecto corresponden al caso más común:
 * IVA 16 %, sin retenciones.
 */
export interface TaxOptions {
  /** Tasa de IVA. Default: `0.16` (16 %). */
  ivaRate?: number
  /** Aplicar retención ISR del 10 % sobre el subtotal. Default: `false`. */
  applyRetIsr?: boolean
  /** Aplicar retención IVA del 10.666 % sobre el subtotal. Default: `false`. */
  applyRetIva?: boolean
}

/** Línea de concepto para construir el desglose desde cero. */
export interface TaxLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// ── Constantes internas ────────────────────────────────────────────────────────

export const DEFAULT_IVA_RATE = 0.16
export const RET_ISR_RATE = 0.1
export const RET_IVA_RATE = 0.10666

/** Redondea a 2 decimales de forma consistente en toda la app fiscal. */
function r2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Calcula el desglose fiscal completo a partir de un subtotal ya conocido.
 *
 * @example
 * calcTaxBreakdown(22600)
 * // → { subtotal: 22600, iva: 3616, total: 26216 }
 *
 * @example
 * calcTaxBreakdown(10000, { applyRetIsr: true, applyRetIva: true })
 * // → { subtotal: 10000, iva: 1600, retIsr: 1000, retIva: 1066.60, total: 9533.40 }
 */
export function calcTaxBreakdown(subtotal: number, opts: TaxOptions = {}): TaxBreakdown {
  const s = r2(subtotal)
  const rate = opts.ivaRate ?? DEFAULT_IVA_RATE
  const iva = r2(s * rate)
  const retIsr = opts.applyRetIsr ? r2(s * RET_ISR_RATE) : undefined
  const retIva = opts.applyRetIva ? r2(s * RET_IVA_RATE) : undefined
  const total = r2(s + iva - (retIsr ?? 0) - (retIva ?? 0))
  return { subtotal: s, iva, retIsr, retIva, total }
}

/** Suma de importes de un conjunto de líneas (subtotal sin impuestos). */
export function sumLineItems(
  lines: { qty: number; unitPrice: number }[],
): number {
  return r2(lines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0))
}

/**
 * Desglose fiscal a partir de líneas de concepto.
 * Atajo de `calcTaxBreakdown(sumLineItems(lines), opts)`.
 */
export function taxFromLineItems(
  lines: { qty: number; unitPrice: number }[],
  opts: TaxOptions = {},
): TaxBreakdown {
  return calcTaxBreakdown(sumLineItems(lines), opts)
}
