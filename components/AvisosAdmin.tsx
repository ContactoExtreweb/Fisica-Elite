'use client'

// Interruptor de los avisos por correo del preparador. Se guarda solo al
// tocarlo (no hay botón de guardar para un único interruptor).
import { useRef, useTransition } from 'react'
import { guardarAvisosAdmin } from '@/app/admin/avisos-actions'

export default function AvisosAdmin({ activo }: { activo: boolean }) {
  const form = useRef<HTMLFormElement>(null)
  const [guardando, guardar] = useTransition()

  return (
    <form ref={form} action={guardarAvisosAdmin} className="avadm">
      <label className="ff-switch">
        <input
          type="checkbox"
          name="avisos_email"
          defaultChecked={activo}
          disabled={guardando}
          onChange={() => guardar(() => form.current?.requestSubmit())}
        />
        <span className="ff-switch-track">
          <span className="ff-switch-thumb" />
        </span>
        <span className="ff-switch-txt">
          Avisarme por correo: mensajes de alumnos, pruebas subidas, solicitudes pagadas,
          contactos de la web, renovaciones y cancelaciones de clase
        </span>
      </label>
      {guardando && <span className="avadm-estado">Guardando…</span>}
    </form>
  )
}
