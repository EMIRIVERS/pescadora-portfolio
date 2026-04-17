'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string
  title: string
  status: string
  created_at: string
  clientName: string | null
  statusLabel: string
  statusColor: string
  statusBg: string
  formattedDate: string
}

interface Props {
  projects: ProjectRow[]
}

// ── Variants ──────────────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnimatedProjectsList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <p
        style={{
          color: 'var(--dash-text-tertiary)',
          fontSize: '13px',
          padding: '20px',
          margin: 0,
        }}
      >
        Sin proyectos registrados.
      </p>
    )
  }

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show">
      {projects.map((project, idx) => (
        <motion.div
          key={project.id}
          variants={itemVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="apd-list-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 20px',
            borderBottom:
              idx < projects.length - 1
                ? '1px solid var(--dash-border)'
                : 'none',
          }}
        >
          {/* Left: name + client */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <Link
              href={`/admin/projects/${project.id}`}
              className="apd-project-link"
              style={{ display: 'block' }}
            >
              {project.title}
            </Link>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--dash-text-tertiary)',
                display: 'block',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.clientName ?? 'Sin cliente'}
            </span>
          </div>

          {/* Right: status pill + date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: project.statusColor,
                background: project.statusBg,
                borderRadius: '6px',
                padding: '3px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {project.statusLabel}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--dash-text-tertiary)',
                whiteSpace: 'nowrap',
                minWidth: '46px',
                textAlign: 'right',
              }}
            >
              {project.formattedDate}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
