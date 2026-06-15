'use client'

import { Plus } from 'lucide-react'

// Evento global escuchado por la primera columna del tablero ("Por hacer").
export const NEW_TASK_EVENT = 'kanban:new-task'

/**
 * Botón "Nueva tarea" de la barra superior. Como las columnas son las dueñas
 * del formulario de alta, este botón solo emite un evento que la primera
 * columna escucha para abrir su formulario inline.
 */
export function NewTaskButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(NEW_TASK_EVENT))}
      className="flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        backgroundColor: '#0071E3',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 500,
        borderRadius: '8px',
        padding: '6px 14px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <Plus size={14} aria-hidden="true" />
      Nueva tarea
    </button>
  )
}
