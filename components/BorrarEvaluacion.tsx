'use client'

// Borrar una prueba que aún no han corregido, por si subiste el vídeo
// equivocado. Solo sale en las pendientes: una vez corregida, el feedback
// del preparador no se tira.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { borrarEvaluacionPendiente } from '@/app/evaluaciones/actions'

export default function BorrarEvaluacion({
  id,
  categoria,
}: {
  id: string
  categoria: string
}) {
  const router = useRouter()
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const borrar = async () => {
    if (
      !confirm(
        `¿Borrar tu prueba de ${categoria}? Se elimina el vídeo y tendrás que subirlo otra vez.`
      )
    )
      return

    setBorrando(true)
    setError(null)
    const res = await borrarEvaluacionPendiente(id)
    if (res.error) {
      setError(res.error)
      setBorrando(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="eval-borrar">
      <button type="button" className="eval-btn-fantasma" onClick={borrar} disabled={borrando}>
        {borrando ? 'Borrando…' : 'Borrar y volver a subir'}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
