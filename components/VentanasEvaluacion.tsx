'use client'

// El preparador abre y cierra los plazos para subir pruebas.
//
// Mientras no haya un plazo abierto, los alumnos tienen el botón de subir
// deshabilitado. Así las pruebas llegan por tandas y no a goteo.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { abrirVentana, cerrarVentana } from '@/app/admin/evaluaciones/actions'
import { SEMANAS_ENTRE_EVALUACIONES, type Ventana } from '@/lib/evaluaciones'

function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}

function sumar(fecha: string, dias: number) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10)
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function VentanasEvaluacion({
  ventanas,
  categorias,
}: {
  ventanas: Ventana[]
  categorias: { id: string; nombre: string }[]
}) {
  const router = useRouter()
  const hoy = hoyISO()

  const [abriendo, setAbriendo] = useState(false)
  const [nombre, setNombre] = useState('')
  // Por defecto, dos semanas de plazo: tiempo de sobra para grabarse sin
  // que se eternice.
  const [inicio, setInicio] = useState(hoy)
  const [fin, setFin] = useState(sumar(hoy, 14))
  const [categoriaId, setCategoriaId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    const res = await abrirVentana({ nombre, inicio, fin, categoriaId })
    setGuardando(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setNombre('')
    setAbriendo(false)
    router.refresh()
  }

  const cerrar = async (v: Ventana) => {
    if (!confirm(`¿Cerrar el plazo "${v.nombre}"? Los alumnos dejarán de poder subir.`)) return
    const res = await cerrarVentana(v.id)
    if (res.error) setError(res.error)
    else router.refresh()
  }

  const nombreCat = (id: string | null) =>
    id ? (categorias.find((c) => c.id === id)?.nombre ?? 'Categoría') : 'Todas las categorías'

  return (
    <div className="vent-bloque">
      <div className="vent-cab">
        <div>
          <h2 className="prog-sub" style={{ margin: 0 }}>
            Plazos para subir pruebas
          </h2>
          <p className="vent-sub">
            Mientras no haya un plazo abierto, tus alumnos no pueden subir nada.
            Lo habitual es abrir uno cada {SEMANAS_ENTRE_EVALUACIONES} semanas.
          </p>
        </div>
        {!abriendo && (
          <button type="button" className="eval-btn" onClick={() => setAbriendo(true)}>
            Abrir un plazo
          </button>
        )}
      </div>

      {abriendo && (
        <div className="vent-form">
          <div className="vent-form-fila">
            <div className="field">
              <label htmlFor="vent-nombre">Nombre</label>
              <input
                id="vent-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej.: Pruebas de octubre"
                disabled={guardando}
              />
            </div>
            <div className="field">
              <label htmlFor="vent-cat">Categoría</label>
              <select
                id="vent-cat"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                disabled={guardando}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="vent-form-fila">
            <div className="field">
              <label htmlFor="vent-ini">Se abre el</label>
              <input
                id="vent-ini"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                disabled={guardando}
              />
            </div>
            <div className="field">
              <label htmlFor="vent-fin">Se cierra el</label>
              <input
                id="vent-fin"
                type="date"
                value={fin}
                min={inicio}
                onChange={(e) => setFin(e.target.value)}
                disabled={guardando}
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="vent-form-acciones">
            <button type="button" className="eval-btn" onClick={guardar} disabled={guardando}>
              {guardando ? 'Abriendo…' : 'Abrir plazo'}
            </button>
            <button
              type="button"
              className="eval-btn-fantasma"
              onClick={() => {
                setAbriendo(false)
                setError(null)
              }}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {ventanas.length === 0 ? (
        <div className="admin-tabla-vacia">
          No hay ningún plazo abierto. Tus alumnos no pueden subir pruebas.
        </div>
      ) : (
        <div className="vent-lista">
          {ventanas.map((v) => {
            const abierta = v.inicio <= hoy && hoy <= v.fin
            const futura = v.inicio > hoy
            return (
              <div key={v.id} className={`vent-item ${abierta ? 'abierta' : ''}`}>
                <div>
                  <div className="vent-item-nombre">
                    {v.nombre}
                    <span className={`eval-pill ${abierta ? 'revisada' : 'pendiente'}`}>
                      {abierta ? 'Abierto' : futura ? 'Programado' : 'Terminado'}
                    </span>
                  </div>
                  <div className="vent-item-meta">
                    {fmt(v.inicio)} → {fmt(v.fin)} · {nombreCat(v.categoriaId)}
                  </div>
                </div>
                <button type="button" className="eval-btn-fantasma" onClick={() => cerrar(v)}>
                  Cerrar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && !abriendo && <p className="form-error">{error}</p>}
    </div>
  )
}
