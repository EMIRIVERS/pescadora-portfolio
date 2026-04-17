'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'

interface HoverLiftLinkProps {
  href: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function HoverLiftLink({ href, children, className, style }: HoverLiftLinkProps) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    </motion.div>
  )
}
