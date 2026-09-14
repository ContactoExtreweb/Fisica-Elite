'use client'

// El preparador escribe la corrección de una prueba y la marca revisada.
// El alumno la ve en /evaluaciones en cuanto se guarda.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { corregirEvaluacion, reabrirEvaluacion } from '@/app/admin/evaluaciones/actions'

export default function CorregirEvaluacion({
  id,
  estado,
  feedback,
}: {
  id: string
  estado: 'pendiente' | 'revisada'
  feedback: string | null
}) {
  const router = useRouter()
  const [texto, setTexto] = useState(feedback ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    const res = await corregirEvaluacion(id, texto)
    setGuardando(false)
    if (res.error) setError(res.error)
    else router.refresh()
  }

  const reabrir = async () => {
    setGuardando(true)
    const res = await reabrirEvaluacion(id)
    setGuardando(false)
    if (res.error) setError(res.error)
    else router.refresh()
  }

  if (estado === 'revisada') {
    return (
      <div className="eval-adm-corregida">
        <div>
          <span className="eval-feedback-label">Tu corrección</span>
          <p>{feedback}</p>
        </div>
        <button
          type="button"
          className="eval-btn-fantasma"
          onClick={reabrir}
          disabled={guardando}
        >
          {guardando ? 'Abriendo…' : 'Volver a abrir'}
        </button>
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="eval-adm-form">
      <label htmlFor={`fb-${id}`}>Corrección para el alumno</label>
      <textarea
        id={`fb-${id}`}
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Qué ha hecho bien, qué corregir y qué trabajar hasta la próxima. Si el tramo no le corresponde, díselo aquí."
        disabled={guardando}
      />
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="eval-btn" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar y marcar revisada'}
      </button>
    </div>
  )
}
