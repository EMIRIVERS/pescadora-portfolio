/**
 * src/lib/billing/format.ts
 *
 * Helpers de formateo monetario centralizados para cotizaciones y facturas.
 * Funciones puras, locale fijo "es-MX".
 */

/**
 * Formatea un monto como moneda con decimales explícitos: `$1,234.00`.
 * Soporta MXN (default) o USD.
 */
export function formatMoney(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un monto como moneda sin centavos forzados: `$1,234`.
 * Estilo dominante de las tablas/KPIs del panel de Xico.
 */
export function formatMoneyShort(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Número con separador de miles, sin signo de moneda: `1,234`. */
export function formatNumber(n: number): string {
  return n.toLocaleString('es-MX')
}

/** Porcentaje con decimales opcionales: `16%`. */
export function formatPercent(n: number, decimals = 0): string {
  return `${n.toFixed(decimals)}%`
}
