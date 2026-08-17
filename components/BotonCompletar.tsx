'use client'

// Marca el ejercicio como completado y, al hacerlo, despliega el registro
// de la marca de ese ejercicio (que es el momento natural para apuntarla).
//
// El formulario aparece solo al completar. Si el alumno lo cierra o ya
// tenía el ejercicio hecho, puede volver a abrirlo con "Apuntar marca".
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marcarCompletado } from '@/app/inicio/progreso-actions'
import FormularioMarca, { type CategoriaMarca } from '@/components/FormularioMarca'

export default function BotonCompletar({
  ejercicioId,
  completadoInicial,
  categoria,
}: {
  ejercicioId: string
  completadoInicial: boolean
  /** Categoría del ejercicio: da la métrica y la unidad del formulario.
   *  Si no se pasa, el botón funciona como antes (sin registro). */
  categoria?: CategoriaMarca | null
}) {
  const [completado, setCompletado] = useState(completadoInicial)
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)
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
    // Al COMPLETAR, se despliega el registro de la marca.
    // Al desmarcar, se recoge.
    setAbierto(nuevo && !!categoria)
    router.refresh()
  }

  return (
    <div className="completar-zona">
      <div className="completar-acciones">
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

        {/* Si ya estaba hecho, deja apuntar la marca cuando quiera */}
        {categoria && completado && !abierto && (
          <button type="button" className="btn-apuntar" onClick={() => setAbierto(true)}>
            Apuntar marca
          </button>
        )}
      </div>

      {categoria && abierto && (
        <div className="completar-registro">
          <div className="completar-registro-cab">
            <span>¿Qué marca has hecho?</span>
            <button
              type="button"
              className="completar-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <FormularioMarca
            categorias={[categoria]}
            categoriaFija={categoria.id}
            ejercicioId={ejercicioId}
            titulo=""
          />
          <p className="completar-saltar">
            Puedes saltártelo: el ejercicio ya cuenta como completado.
          </p>
        </div>
      )}
    </div>
  )
}
