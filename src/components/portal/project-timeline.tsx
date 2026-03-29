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
    label: 'Pre-produccion',
    sublabel: 'Concepto, plan de rodaje y logistica',
  },
  {
    key: 'production',
    label: 'Produccion',
    sublabel: 'Rodaje y captura de material',
  },
  {
    key: 'post_production',
    label: 'Post-produccion',
    sublabel: 'Edicion, retoques y revision',
  },
]

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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8">
      {/* Delivered banner */}
      {isDelivered && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
        >
          <CheckIcon />
          <span className="text-emerald-400 text-sm font-medium">
            Proyecto entregado — todas las fases completadas
          </span>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row">
        {PHASES.map((phase, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const isUpcoming = index > currentIndex
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
                    <div className="relative flex items-center justify-center w-8 h-8">
                      <motion.div
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.35, 0, 0.35],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-full bg-sky-500/30"
                      />
                      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      </div>
                    </div>
                  ) : isDone ? (
                    <div className="w-8 h-8 rounded-full bg-sky-700 flex items-center justify-center text-sky-200">
                      <CheckIcon />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    </div>
                  )}
                </motion.div>

                {/* Connector */}
                {!isLast && (
                  <div className="sm:flex-1 sm:h-px sm:w-auto sm:min-w-[16px] h-6 w-px sm:mx-1 mx-auto">
                    <div
                      className={`h-full w-full ${
                        isDone ? 'bg-sky-700' : 'bg-zinc-700'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Label */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.1 + 0.08 }}
                className="sm:mt-3 ml-3 sm:ml-0 pb-6 sm:pb-0 sm:pr-4 min-w-0"
              >
                <p
                  className={`text-sm font-medium leading-snug ${
                    isCurrent
                      ? 'text-sky-300'
                      : isDone
                      ? 'text-zinc-300'
                      : 'text-zinc-600'
                  }`}
                >
                  {phase.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex items-center text-xs font-medium bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded-full border border-sky-500/20">
                      Actual
                    </span>
                  )}
                </p>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    isCurrent ? 'text-zinc-400' : isDone ? 'text-zinc-500' : 'text-zinc-700'
                  }`}
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
