'use client'

import { useRouter, usePathname } from 'next/navigation'

type Period = 'month' | '3months' | 'year' | 'all'

const BUTTONS: { label: string; value: Period }[] = [
  { label: 'Este mes', value: 'month' },
  { label: 'Ultimos 3 meses', value: '3months' },
  { label: 'Este ano', value: 'year' },
  { label: 'Todo', value: 'all' },
]

interface PeriodSelectorProps {
  currentPeriod: Period
}

export default function PeriodSelector({ currentPeriod }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  function handleSelect(period: Period) {
    const params = new URLSearchParams()
    if (period !== 'all') {
      params.set('period', period)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        background: '#1C1C1E',
        borderRadius: '10px',
        padding: '3px',
        border: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
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
              background: isActive ? '#0071E3' : 'transparent',
              color: isActive ? '#FFFFFF' : '#86868B',
              transition: 'background 0.15s, color 0.15s',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
            aria-pressed={isActive}
          >
            {btn.label}
          </button>
        )
      })}
    </div>
  )
}
