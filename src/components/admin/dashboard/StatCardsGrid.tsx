'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FolderKanban,
  Users,
  Target,
  CheckCircle2,
  Film,
  DollarSign,
} from 'lucide-react'
import { useCountUp } from './useCountUp'

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP = {
  FolderKanban,
  Users,
  Target,
  CheckCircle2,
  Film,
  DollarSign,
} as const

type IconKey = keyof typeof ICON_MAP

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatCardData {
  label: string
  sublabel: string
  value: number
  /** Optional pre-formatted string (e.g. currency) shown instead of raw number */
  displayValue?: string
  iconKey: IconKey
  accent: string
  href: string
}

interface Props {
  cards: StatCardData[]
}

// ── Single animated stat card ─────────────────────────────────────────────────

interface StatCardProps extends StatCardData {
  index: number
}

function StatCard({ label, sublabel, value, displayValue, iconKey, accent, href, index }: StatCardProps) {
  const Icon = ICON_MAP[iconKey]
  // Only count-up numeric values (skip currency displayValue cards — raw number still animates)
  const animatedValue = useCountUp(value, 0.8)
  const displayedNumber = displayValue ?? String(animatedValue)

  return (
    <motion.div
      key={label}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <Link href={href} className="apd-stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `${accent}1A`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={accent} strokeWidth={1.8} />
        </div>
        <p
          style={{
            fontSize: displayValue ? '18px' : '32px',
            fontWeight: 700,
            color: 'var(--dash-text-primary)',
            margin: 0,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            wordBreak: 'break-all',
          }}
        >
          {displayedNumber}
        </p>
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--dash-text-secondary)',
              margin: '0 0 2px 0',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
            {sublabel}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Grid ──────────────────────────────────────────────────────────────────────

export function StatCardsGrid({ cards }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '28px',
      }}
    >
      {cards.map((card, index) => (
        <StatCard key={card.label} {...card} index={index} />
      ))}
    </div>
  )
}
