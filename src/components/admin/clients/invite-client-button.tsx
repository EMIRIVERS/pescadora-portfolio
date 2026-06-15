'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { InviteClientModal } from '@/components/admin/clients/invite-client-modal'

export function InviteClientButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-all duration-150 active:scale-95"
        style={{
          backgroundColor: 'var(--dash-accent)',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--dash-accent-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--dash-accent)'
        }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Nuevo cliente
      </button>

      {open && <InviteClientModal onClose={() => setOpen(false)} />}
    </>
  )
}
