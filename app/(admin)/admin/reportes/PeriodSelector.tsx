'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

export type Period = 'month' | '3months' | 'year' | 'all' | 'custom'

const BUTTONS: { label: string; value: Period }[] = [
  { label: 'Este mes', value: 'month' },
  { label: 'Últimos 3 meses', value: '3months' },
  { label: 'Este año', value: 'year' },
  { label: 'Todo', value: 'all' },
  { label: 'Personalizado', value: 'custom' },
]

interface PeriodSelectorProps {
  currentPeriod: Period
  currentFrom?: string
  currentTo?: string
}

function PeriodSelectorInner({ currentPeriod, currentFrom, currentTo }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState<string>(currentFrom ?? today)
  const [toDate, setToDate] = useState<string>(currentTo ?? today)

  function buildUrl(period: Period, from?: string, to?: string): string {
    const params = new URLSearchParams(searchParams.toString())
    if (period === 'all') {
      params.delete('period')
    } else {
      params.set('period', period)
    }
    if (period === 'custom' && from && to) {
      params.set('from', from)
      params.set('to', to)
    } else {
      params.delete('from')
      params.delete('to')
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleSelect(period: Period) {
    if (period === 'custom') {
      // Stay on page but show inputs — navigate only when dates are applied
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', 'custom')
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      router.push(`${pathname}?${params.toString()}`)
      return
    }
    router.push(buildUrl(period))
  }

  function handleApplyCustom() {
    router.push(buildUrl('custom', fromDate, toDate))
  }

  const isCustom = currentPeriod === 'custom'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--dash-surface-2)',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid var(--dash-border)',
          flexWrap: 'wrap',
        }}
      >
        {BUTTONS.map((btn) => {
          const isActive = currentPeriod === btn.value
          return (
            <button
              key={btn.value}
              onClick={() => handleSelect(btn.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--dash-accent)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--dash-text-secondary)',
                transition: 'background 0.15s, color 0.15s',
                letterSpacing: '-0.01em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              }}
              aria-pressed={isActive}
            >
              {btn.label}
            </button>
          )
        })}
      </div>

      {isCustom && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'var(--dash-surface-2)',
            border: '1px solid var(--dash-border)',
            borderRadius: '10px',
            padding: '6px 10px',
          }}
        >
          <label style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Desde
          </label>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              background: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '6px',
              color: 'var(--dash-text-primary)',
              fontSize: '12px',
              padding: '4px 8px',
              fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              cursor: 'pointer',
              outline: 'none',
            }}
          />
          <label style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Hasta
          </label>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              background: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '6px',
              color: 'var(--dash-text-primary)',
              fontSize: '12px',
              padding: '4px 8px',
              fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              cursor: 'pointer',
              outline: 'none',
            }}
          />
          <button
            onClick={handleApplyCustom}
            disabled={!fromDate || !toDate}
            style={{
              padding: '5px 12px',
              borderRadius: '7px',
              border: 'none',
              cursor: fromDate && toDate ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 600,
              background: fromDate && toDate ? 'var(--dash-accent)' : 'var(--dash-border)',
              color: fromDate && toDate ? '#FFFFFF' : 'var(--dash-text-tertiary)',
              transition: 'background 0.15s, color 0.15s',
              lineHeight: 1,
              fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}

export default function PeriodSelector(props: PeriodSelectorProps) {
  return (
    <Suspense fallback={null}>
      <PeriodSelectorInner {...props} />
    </Suspense>
  )
}
