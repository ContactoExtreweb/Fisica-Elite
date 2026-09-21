'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearTramo, actualizarTramo, borrarTramo } from '@/app/admin/categorias/actions'

export type TramoUI = {
  id: string
  nombre: string
  valor_min: string
  valor_max: string
  orden: string
  nEjercicios: number
}

export default function TramosEditor({
  categoriaId,
  unidad,
  tramos,
}: {
  categoriaId: string
  unidad: string
  tramos: TramoUI[]
}) {
  const [filas, setFilas] = useState<TramoUI[]>(tramos)
  const [nuevo, setNuevo] = useState({
    nombre: '',
    valor_min: '',
    valor_max: '',
    orden: String(tramos.length),
  })
  const [error, setError] = useState<string | null>(null)
  const [pendiente, start] = useTransition()
  const router = useRouter()

  // Tras guardar/crear/borrar, router.refresh() re-renderiza la página del
  // servidor y llegan tramos nuevos por props: sincronizamos el estado.
  // Se ajusta EN RENDER al cambiar la prop, no en un efecto.
  const [tramosVistos, setTramosVistos] = useState(tramos)
  if (tramos !== tramosVistos) {
    setTramosVistos(tramos)
    setFilas(tramos)
  }

  const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

  const cambiar = (
    id: string,
    campo: 'nombre' | 'valor_min' | 'valor_max' | 'orden',
    valor: string
  ) => setFilas((f) => f.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)))

  const guardar = (t: TramoUI) =>
    start(async () => {
      setError(null)
      const res = await actualizarTramo(t.id, {
        categoria_id: categoriaId,
        nombre: t.nombre,
        valor_min: num(t.valor_min),
        valor_max: num(t.valor_max),
        orden: parseInt(t.orden || '0', 10) || 0,
      })
      if (res.error) setError(res.error)
      else router.refresh()
    })

  const borrar = (t: TramoUI) => {
    const aviso =
      t.nEjercicios > 0
        ? `El tramo «${t.nombre}» tiene ${t.nEjercicios} ejercicio(s): pasarán a verse en TODOS los tramos de la categoría. ¿Borrar?`
        : `¿Borrar el tramo «${t.nombre}»?`
    if (!confirm(aviso)) return
    start(async () => {
      setError(null)
      const res = await borrarTramo(t.id, categoriaId)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  const anadir = () =>
    start(async () => {
      setError(null)
      const res = await crearTramo({
        categoria_id: categoriaId,
        nombre: nuevo.nombre,
        valor_min: num(nuevo.valor_min),
        valor_max: num(nuevo.valor_max),
        orden: parseInt(nuevo.orden || '0', 10) || 0,
      })
      if (res.error) setError(res.error)
      else {
        setNuevo({
          nombre: '',
          valor_min: '',
          valor_max: '',
          orden: String((parseInt(nuevo.orden || '0', 10) || 0) + 1),
        })
        router.refresh()
      }
    })

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h3>Tramos de la categoría</h3>
        <div className="meta">El alumno solo ve los ejercicios de SU tramo</div>
      </div>

      {filas.length === 0 && (
        <div className="admin-tabla-vacia">
          Aún no hay tramos. Añade el primero abajo (p. ej. «0-9» {unidad}).
        </div>
      )}

      <div className="tramos-editor">
        {filas.map((t) => (
          <div key={t.id} className="tramo-fila">
            <input
              value={t.nombre}
              onChange={(e) => cambiar(t.id, 'nombre', e.target.value)}
              placeholder="Nombre (0-9)"
            />
            <input
              value={t.valor_min}
              onChange={(e) => cambiar(t.id, 'valor_min', e.target.value)}
              placeholder={`Mín (${unidad})`}
              inputMode="decimal"
            />
            <input
              value={t.valor_max}
              onChange={(e) => cambiar(t.id, 'valor_max', e.target.value)}
              placeholder={`Máx (${unidad})`}
              inputMode="decimal"
            />
            <input
              value={t.orden}
              onChange={(e) => cambiar(t.id, 'orden', e.target.value)}
              placeholder="Orden"
              inputMode="numeric"
            />
            <div className="tramo-btns">
              <span className="tramo-fila-meta">{t.nEjercicios} ej.</span>
              <button type="button" className="btn-mini" onClick={() => guardar(t)} disabled={pendiente}>
                Guardar
              </button>
              <button type="button" className="btn-mini peligro" onClick={() => borrar(t)} disabled={pendiente}>
                Borrar
              </button>
            </div>
          </div>
        ))}

        {/* Añadir nuevo tramo */}
        <div className="tramo-fila nuevo">
          <input
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            placeholder="Nuevo tramo (9-12)"
          />
          <input
            value={nuevo.valor_min}
            onChange={(e) => setNuevo({ ...nuevo, valor_min: e.target.value })}
            placeholder={`Mín (${unidad})`}
            inputMode="decimal"
          />
          <input
            value={nuevo.valor_max}
            onChange={(e) => setNuevo({ ...nuevo, valor_max: e.target.value })}
            placeholder={`Máx (${unidad})`}
            inputMode="decimal"
          />
          <input
            value={nuevo.orden}
            onChange={(e) => setNuevo({ ...nuevo, orden: e.target.value })}
            placeholder="Orden"
            inputMode="numeric"
          />
          <div className="tramo-btns">
            <button
              type="button"
              className="btn-mini"
              onClick={anadir}
              disabled={pendiente || !nuevo.nombre.trim()}
            >
              + Añadir tramo
            </button>
          </div>
        </div>
      </div>

      {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}

      <p className="tramos-ayuda">
        «Mín» y «Máx» son opcionales: los usará el cuestionario del alumno para asignarle
        tramo automáticamente según su marca. El «orden» define la progresión (0 = el más
        básico). Un ejercicio sin tramo se ve en todos los tramos de su categoría.
      </p>
    </div>
  )
}
