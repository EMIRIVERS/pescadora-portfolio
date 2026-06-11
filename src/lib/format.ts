// Server-safe formatting helpers. Kept out of any 'use client' module so they
// can be imported from Server Components without Next.js treating them as
// client function references.

/** Full currency format: $1,234,567 MXN */
export function formatBudget(
  budget: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (budget == null) return '—'
  const code = currency ?? 'MXN'
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(budget)
  } catch {
    return `$${budget.toLocaleString('es-MX')} ${code}`
  }
}

/** Compact format: $1.2M, $850k, $12k */
export function formatBudgetCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000
    return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`
  }
  if (amount >= 1_000) {
    const v = amount / 1_000
    return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`
  }
  return `$${amount.toLocaleString('es-MX')}`
}
