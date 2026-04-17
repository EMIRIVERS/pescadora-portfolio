'use client'

import { Printer } from 'lucide-react'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 20px',
        backgroundColor: '#0071E3',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        color: '#ffffff',
        cursor: 'pointer',
        fontFamily: FONT,
      }}
    >
      <Printer size={14} strokeWidth={1.5} />
      Imprimir / Guardar PDF
    </button>
  )
}
