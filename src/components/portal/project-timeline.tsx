'use client'

import { motion } from 'framer-motion'
import type { ProjectStatus } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PhaseDefinition {
  key: ProjectStatus
  label: string
  sublabel: string
}

const PHASES: PhaseDefinition[] = [
  {
    key: 'pre_production',
    label: 'Pre-producción',
    sublabel: 'Concepto, plan de rodaje y logística',
  },
  {
    key: 'production',
    label: 'Producción',
    sublabel: 'Rodaje y captura de material',
  },
  {
    key: 'post_production',
    label: 'Post-producción',
    sublabel: 'Edición, retoques y revisión',
  },
]

// ── Cinematic brand tokens ──────────────────────────────────────────────────
const CREAM = 'var(--portal-text)'
const MUTED = 'var(--portal-text-muted)'
const FAINT = 'var(--portal-text-dim)'
const ACCENT = 'var(--portal-accent)'
const ACCENT_DONE = 'rgba(232,52,26,0.45)'
const TRACK = 'rgba(237,232,224,0.1)'
const BORDER = 'var(--portal-border)'
const SERIF = 'var(--portal-serif)'
const MONO = 'var(--portal-mono)'

// "delivered" is the terminal state — all 3 phases are shown as completed
const CURRENT_INDEX_BY_STATUS: Record<ProjectStatus, number> = {
  pre_production: 0,
  production: 1,
  post_production: 2,
  delivered: 3, // beyond last phase index — all complete
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectTimelineProps {
  currentStatus: ProjectStatus
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectTimeline({ currentStatus }: ProjectTimelineProps) {
  const currentIndex = CURRENT_INDEX_BY_STATUS[currentStatus]
  const isDelivered = currentStatus === 'delivered'

  return (
    <div
      className="portal-card"
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: '6px',
        padding: 'clamp(1.6rem, 4vw, 2.4rem)',
      }}
    >
      {/* Delivered banner */}
      {isDelivered && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5"
          style={{
            marginBottom: '1.8rem',
            padding: '0.7rem 1rem',
            borderRadius: '4px',
            background: 'rgba(232,52,26,0.08)',
            border: `1px solid ${ACCENT_DONE}`,
            color: ACCENT,
          }}
        >
          <CheckIcon />
          <span style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT }}>
            Proyecto entregado — todas las fases completadas
          </span>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row">
        {PHASES.map((phase, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const isActive = isDone || isCurrent
          const isLast = index === PHASES.length - 1

          return (
            <div
              key={phase.key}
              className="flex sm:flex-col flex-row flex-1 min-w-0"
            >
              {/* Node + connector row */}
              <div className="flex sm:flex-row flex-col items-center">
                {/* Phase node */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35, delay: index * 0.1 }}
                  className="shrink-0"
                >
                  {isCurrent ? (
                    <div className="relative flex items-center justify-center" style={{ width: '2rem', height: '2rem' }}>
                      <motion.div
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.4, 0, 0.4],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-full"
                        style={{ background: ACCENT_DONE }}
                      />
                      <div
                        className="flex items-center justify-center"
                        style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: ACCENT, boxShadow: '0 0 18px rgba(232,52,26,0.35)' }}
                      >
                        <div style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: '#fff' }} />
                      </div>
                    </div>
                  ) : isDone ? (
                    <div
                      className="flex items-center justify-center"
                      style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: ACCENT_DONE, color: CREAM }}
                    >
                      <CheckIcon />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: `1px solid ${TRACK}`, background: 'transparent' }}
                    >
                      <div style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: FAINT }} />
                    </div>
                  )}
                </motion.div>

                {/* Connector */}
                {!isLast && (
                  <div className="sm:flex-1 sm:h-px sm:w-auto sm:min-w-[16px] h-6 w-px sm:mx-2 mx-auto">
                    <div
                      style={{ height: '100%', width: '100%', background: isDone ? ACCENT_DONE : TRACK }}
                    />
                  </div>
                )}
              </div>

              {/* Label */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.1 + 0.08 }}
                className="sm:mt-4 ml-3 sm:ml-0 pb-6 sm:pb-0 sm:pr-4 min-w-0"
              >
                <p className="flex items-center gap-2" style={{ margin: 0 }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: '0.64rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      lineHeight: 1.3,
                      color: isCurrent ? ACCENT : isDone ? CREAM : FAINT,
                    }}
                  >
                    {phase.label}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: '0.5rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: ACCENT,
                        border: `1px solid ${ACCENT_DONE}`,
                        borderRadius: '2px',
                        padding: '0.15rem 0.35rem',
                      }}
                    >
                      Actual
                    </span>
                  )}
                </p>
                <p
                  style={{
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    fontSize: '0.98rem',
                    lineHeight: 1.4,
                    margin: '0.55rem 0 0',
                    color: isActive ? MUTED : FAINT,
                  }}
                >
                  {phase.sublabel}
                </p>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
