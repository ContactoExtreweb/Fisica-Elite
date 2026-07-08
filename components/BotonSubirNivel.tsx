'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { subirDeNivel } from '@/app/inicio/progreso-actions'

const NOMBRE_NIVEL: Record<string, string> = {
  avanzado: 'Avanzado',
  profesional: 'Profesional',
}

export default function BotonSubirNivel() {
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const subir = async () => {
    if (!confirm('¿Seguro que quieres pasar al siguiente nivel? Se te desbloqueará el contenido nuevo.')) return
    setCargando(true)
    setError(null)
    const res = await subirDeNivel()
    setCargando(false)
    if (res.ok && res.nivel) {
      setResultado(res.nivel)
      router.refresh()
    } else {
      setError(res.error ?? 'No se pudo subir de nivel')
    }
  }

  if (resultado) {
    return (
      <div className="subir-exito">
        <div className="subir-exito-emoji">🎉</div>
        <div className="subir-exito-titulo">¡Ya eres nivel {NOMBRE_NIVEL[resultado] ?? resultado}!</div>
        <div className="subir-exito-sub">Se ha desbloqueado tu nuevo contenido. ¡A por ello!</div>
        <button type="button" className="cta-primary" onClick={() => router.push('/inicio')} style={{ marginTop: 16, width: 'auto', padding: '12px 24px' }}>
          Ver mis nuevos ejercicios
        </button>
      </div>
    )
  }

  return (
    <>
      <button type="button" className="cta-primary" onClick={subir} disabled={cargando} style={{ width: '100%' }}>
        {cargando ? 'Subiendo…' : 'Sí, quiero subir de nivel'}
      </button>
      {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
    </>
  )
}
