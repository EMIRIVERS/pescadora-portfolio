'use client'

import { useState } from 'react'
import { InviteClientModal } from '@/components/admin/clients/invite-client-modal'

export function InviteClientButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-[#2a2a2a] hover:border-[#444] text-[#aaa] hover:text-[#e8e8e8] text-[11px] font-mono tracking-[0.15em] uppercase rounded-sm transition-colors"
      >
        Invitar cliente
      </button>

      {open && <InviteClientModal onClose={() => setOpen(false)} />}
    </>
  )
}
