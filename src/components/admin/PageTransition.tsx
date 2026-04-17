'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
