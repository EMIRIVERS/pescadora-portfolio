'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface AnimatedEmptyStateProps {
  children: ReactNode
}

export function AnimatedEmptyState({ children }: AnimatedEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {children}
    </motion.div>
  )
}
