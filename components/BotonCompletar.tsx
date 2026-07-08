'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marcarCompletado } from '@/app/inicio/progreso-actions'

export default function BotonCompletar({
  ejercicioId,
  completadoInicial,
}: {
  ejercicioId: string
  completadoInicial: boolean
}) {
  const [completado, setCompletado] = useState(completadoInicial)
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  const alternar = async () => {
    const nuevo = !completado
    setCargando(true)
    // Eco optimista
    setCompletado(nuevo)
    const res = await marcarCompletado(ejercicioId, nuevo)
    setCargando(false)
    if (!res.ok) {
      setCompletado(!nuevo) // revertir si falla
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      className={`btn-completar ${completado ? 'hecho' : ''}`}
      onClick={alternar}
      disabled={cargando}
    >
      <span className="btn-completar-check">
        {completado ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {completado ? 'Completado' : 'Marcar como completado'}
    </button>
  )
}
