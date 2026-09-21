'use client'

// Gestor de suscripciones en la ficha del alumno.
// Lista cada suscripción por separado (una por plan contratado) y permite
// renovarlas, darlas de baja individualmente, o añadir un plan nuevo.
import { useState, useTransition } from 'react'
import {
  anadirSuscripciones,
  renovarSuscripcion,
  cancelarSuscripcion,
} from '@/app/admin/alumnos/suscripciones-actions'
import { hoyMadrid } from '@/lib/fechas'

export type PlanOpcion = {
  id: string
  nombre: string
  tipo: 'ejercicio' | 'completo' | 'oposicion'
  precio_centimos: number
}

export type SuscripcionFila = {
  id: string
  plan_id: string | null
  plan_nombre: string | null
  estado: string
  metodo: string
  meses: number
  fecha_inicio: string
  fecha_fin: string
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function euros(c: number) {
  return (c / 100).toFixed(2).replace('.', ',') + ' €'
}

export default function GestorSuscripciones({
  alumnoId,
  suscripciones,
  planes,
}: {
  alumnoId: string
  suscripciones: SuscripcionFila[]
  planes: PlanOpcion[]
}) {
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [anadiendo, setAnadiendo] = useState(false)

  // Estado del formulario de "añadir plan"
  const [sueltos, setSueltos] = useState<string[]>([])
  const [completa, setCompleta] = useState(false)
  const [oposicionOn, setOposicionOn] = useState(false)
  const [planOposicion, setPlanOposicion] = useState('')
  const [meses, setMeses] = useState(1)

  // Meses a renovar por suscripción
  const [mesesRenovar, setMesesRenovar] = useState<Record<string, number>>({})

  const hoy = hoyMadrid()
  const planesEjercicio = planes.filter((p) => p.tipo === 'ejercicio')
  const planCompleto = planes.find((p) => p.tipo === 'completo')
  const planesOposicion = planes.filter((p) => p.tipo === 'oposicion')

  const idsSeleccionados = [
    ...(completa && planCompleto ? [planCompleto.id] : []),
    ...(!completa ? sueltos : []),
    ...(oposicionOn && planOposicion ? [planOposicion] : []),
  ]

  const limpiar = () => {
    setSueltos([])
    setCompleta(false)
    setOposicionOn(false)
    setPlanOposicion('')
    setMeses(1)
    setAnadiendo(false)
  }

  const anadir = () => {
    if (idsSeleccionados.length === 0) {
      setError('Marca al menos un plan')
      return
    }
    startTransition(async () => {
      setError(null)
      const res = await anadirSuscripciones(alumnoId, idsSeleccionados, meses)
      if (res.error) setError(res.error)
      else limpiar()
    })
  }

  const renovar = (subId: string) => {
    const m = mesesRenovar[subId] ?? 1
    startTransition(async () => {
      setError(null)
      const res = await renovarSuscripcion(subId, m)
      if (res.error) setError(res.error)
    })
  }

  const cancelar = (subId: string, nombre: string) => {
    if (!confirm(`¿Dar de baja «${nombre}»? El resto de sus accesos siguen activos.`)) return
    startTransition(async () => {
      setError(null)
      const res = await cancelarSuscripcion(subId)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="susc-gestor">
      <div className="susc-gestor-cab">
        <h2 className="prog-sub" style={{ margin: 0 }}>
          Accesos contratados
        </h2>
        {!anadiendo && (
          <button type="button" className="btn-apuntar" onClick={() => setAnadiendo(true)}>
            + Añadir plan
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {/* --- Añadir un plan nuevo --- */}
      {anadiendo && (
        <div className="susc-anadir">
          {planes.length === 0 ? (
            <p className="form-error" style={{ margin: 0 }}>
              No hay planes creados. Ve a «Planes y precios» y crea al menos uno.
            </p>
          ) : (
            <>
              <div className="susc-anadir-tit">¿Qué contrata?</div>

              {planesEjercicio.length > 0 && (
                <div className="acceso-grupo">
                  <div className="acceso-grupo-tit">Cursos por ejercicio</div>
                  <div className="acceso-checks">
                    {planesEjercicio.map((p) => (
                      <label
                        key={p.id}
                        className={`acceso-check ${completa ? 'off' : ''} ${
                          sueltos.includes(p.id) ? 'on' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sueltos.includes(p.id)}
                          disabled={completa}
                          onChange={() =>
                            setSueltos((s) =>
                              s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]
                            )
                          }
                        />
                        <span>{p.nombre}</span>
                        <span className="acceso-precio">{euros(p.precio_centimos)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {planCompleto && (
                <div className="acceso-grupo">
                  <label className={`acceso-check destacado ${completa ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={completa}
                      onChange={(e) => {
                        setCompleta(e.target.checked)
                        if (e.target.checked) setSueltos([])
                      }}
                    />
                    <span>{planCompleto.nombre} · acceso a todo</span>
                    <span className="acceso-precio">{euros(planCompleto.precio_centimos)}</span>
                  </label>
                </div>
              )}

              {planesOposicion.length > 0 && (
                <div className="acceso-grupo">
                  <label className={`acceso-check ${oposicionOn ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={oposicionOn}
                      onChange={(e) => {
                        setOposicionOn(e.target.checked)
                        if (!e.target.checked) setPlanOposicion('')
                        else if (planesOposicion.length === 1)
                          setPlanOposicion(planesOposicion[0].id)
                      }}
                    />
                    <span>Plan por oposición</span>
                  </label>
                  {oposicionOn && (
                    <select
                      className="acceso-select"
                      value={planOposicion}
                      onChange={(e) => setPlanOposicion(e.target.value)}
                    >
                      <option value="" disabled>
                        Elige la oposición…
                      </option>
                      {planesOposicion.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} · {euros(p.precio_centimos)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="susc-anadir-pie">
                <div className="susc-meses">
                  <label htmlFor="meses-nuevo">Meses</label>
                  <input
                    type="number"
                    id="meses-nuevo"
                    min={1}
                    max={24}
                    value={meses}
                    onChange={(e) => setMeses(Number(e.target.value))}
                  />
                </div>
                <div className="susc-anadir-botones">
                  <button type="button" className="btn-apuntar" onClick={limpiar}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="marca-guardar"
                    onClick={anadir}
                    disabled={pendiente}
                  >
                    {pendiente ? 'Añadiendo…' : 'Añadir acceso'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- Lista de suscripciones --- */}
      {suscripciones.length === 0 ? (
        <p className="marca-vacio">
          Este alumno no tiene ningún acceso contratado todavía.
        </p>
      ) : (
        <div className="susc-lista">
          {suscripciones.map((s) => {
            const viva = s.estado === 'activa' && s.fecha_fin >= hoy
            const caducada = s.estado === 'activa' && s.fecha_fin < hoy
            const nombre = s.plan_nombre ?? 'Acceso completo'
            return (
              <div key={s.id} className={`susc-item ${viva ? 'viva' : ''}`}>
                <div className="susc-item-info">
                  <div className="susc-item-nombre">{nombre}</div>
                  <div className="susc-item-datos">
                    {fmt(s.fecha_inicio)} → {fmt(s.fecha_fin)} · {s.meses}{' '}
                    {s.meses === 1 ? 'mes' : 'meses'} · {s.metodo}
                  </div>
                </div>

                <div className="susc-item-estado">
                  {viva ? (
                    <span className="susc-pill activa">● Activa</span>
                  ) : caducada ? (
                    <span className="susc-pill inactiva">● Caducada</span>
                  ) : (
                    <span className="susc-pill inactiva">● De baja</span>
                  )}
                </div>

                <div className="susc-item-acciones">
                  <div className="susc-renovar">
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={mesesRenovar[s.id] ?? 1}
                      onChange={(e) =>
                        setMesesRenovar((m) => ({ ...m, [s.id]: Number(e.target.value) }))
                      }
                      aria-label="Meses a renovar"
                    />
                    <button
                      type="button"
                      className="btn-apuntar"
                      onClick={() => renovar(s.id)}
                      disabled={pendiente}
                    >
                      Renovar
                    </button>
                  </div>
                  {s.estado === 'activa' && (
                    <button
                      type="button"
                      className="ff-btn-peligro susc-baja"
                      onClick={() => cancelar(s.id, nombre)}
                      disabled={pendiente}
                    >
                      Dar de baja
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
