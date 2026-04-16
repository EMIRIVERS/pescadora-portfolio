'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FolderKanban,
  Users,
  Target,
  CheckCircle2,
  Film,
} from 'lucide-react'

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP = {
  FolderKanban,
  Users,
  Target,
  CheckCircle2,
  Film,
} as const

type IconKey = keyof typeof ICON_MAP

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatCardData {
  label: string
  sublabel: string
  value: number
  iconKey: IconKey
  accent: string
  href: string
}

interface Props {
  cards: StatCardData[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatCardsGrid({ cards }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        marginBottom: '28px',
      }}
    >
      {cards.map(({ label, sublabel, value, iconKey, accent, href }, index) => {
        const Icon = ICON_MAP[iconKey]
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
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
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#F5F5F7',
                  margin: 0,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {value}
              </p>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#86868B',
                    margin: '0 0 2px 0',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </p>
                <p style={{ fontSize: '11px', color: '#48484A', margin: 0 }}>
                  {sublabel}
                </p>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
