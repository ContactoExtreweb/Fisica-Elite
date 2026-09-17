'use client'

// Selector de acceso para el pago en efectivo del alta.
// Lee los planes REALES creados en "Planes y precios" y deja elegir:
//  · Planes por ejercicio (sueltos): varios a la vez (checkboxes)
//  · Preparación completa: al marcarla, desactiva los sueltos
//  · Por oposición: despliega el selector de oposición
// Cada plan elegido viaja en inputs ocultos; el servidor crea una
// suscripción por cada uno con los meses indicados.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Plan = {
  id: string
  nombre: string
  tipo: 'ejercicio' | 'completo' | 'oposicion'
  precio_centimos: number
  especialidad: string | null
}

function euros(c: number) {
  return (c / 100).toFixed(2).replace('.', ',') + ' €'
}

export default function SelectorAccesoAlta() {
  const [activo, setActivo] = useState(false) // "ha pagado en efectivo"
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)

  const [sueltos, setSueltos] = useState<string[]>([]) // ids de planes 'ejercicio'
  const [completa, setCompleta] = useState(false)
  const [oposicionOn, setOposicionOn] = useState(false)
  const [planOposicion, setPlanOposicion] = useState('') // id del plan 'oposicion'

  useEffect(() => {
    const cargar = async () => {
      const sb = createClient()
      const { data } = await sb
        .from('planes')
        .select('id, nombre, tipo, precio_centimos, especialidad')
        .eq('activo', true)
        .order('orden')
        .order('nombre')
      setPlanes((data ?? []) as Plan[])
      setCargando(false)
    }
    cargar()
  }, [])

  const planesEjercicio = planes.filter((p) => p.tipo === 'ejercicio')
  const planCompleto = planes.find((p) => p.tipo === 'completo')
  const planesOposicion = planes.filter((p) => p.tipo === 'oposicion')

  const toggleSuelto = (id: string) =>
    setSueltos((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // Al marcar "completa", limpiamos los sueltos (el completo ya los incluye)
  const marcarCompleta = (v: boolean) => {
    setCompleta(v)
    if (v) setSueltos([])
  }

  // IDs de planes finalmente seleccionados (para los inputs ocultos)
  const idsSeleccionados: string[] = [
    ...(completa && planCompleto ? [planCompleto.id] : []),
    ...(!completa ? sueltos : []),
    ...(oposicionOn && planOposicion ? [planOposicion] : []),
  ]

  const hayAlgo = idsSeleccionados.length > 0

  return (
    <div className="field-group bloque-opcion">
      <label className="radio-opcion" style={{ fontSize: 14 }}>
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Ha pagado en efectivo
      </label>

      {/* Marcador para el servidor: hay pago en efectivo */}
      {activo && <input type="hidden" name="pagado" value="on" />}

      {activo && (
        <div className="acceso-box">
          {cargando ? (
            <p className="nota-campo">Cargando planes…</p>
          ) : planes.length === 0 ? (
            <p className="form-error" style={{ margin: 0 }}>
              No hay planes creados todavía. Ve a «Planes y precios» y crea al menos uno.
            </p>
          ) : (
            <>
              <div className="acceso-titulo">¿A qué le das acceso?</div>

              {/* Planes por ejercicio (sueltos) */}
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
                          onChange={() => toggleSuelto(p.id)}
                        />
                        <span>{p.nombre}</span>
                        <span className="acceso-precio">{euros(p.precio_centimos)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Preparación completa */}
              {planCompleto && (
                <div className="acceso-grupo">
                  <label className={`acceso-check destacado ${completa ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={completa}
                      onChange={(e) => marcarCompleta(e.target.checked)}
                    />
                    <span>{planCompleto.nombre} · acceso a todo</span>
                    <span className="acceso-precio">{euros(planCompleto.precio_centimos)}</span>
                  </label>
                </div>
              )}

              {/* Por oposición */}
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

              {/* Meses */}
              <div className="acceso-meses">
                <label htmlFor="meses">Meses pagados</label>
                <input type="number" id="meses" name="meses" min={1} max={24} defaultValue={1} />
                <p className="nota-campo">
                  La cuenta tendrá acceso ese tiempo desde hoy. Se crea una suscripción por cada
                  plan seleccionado.
                </p>
              </div>

              {/* IDs de planes seleccionados para el servidor */}
              {idsSeleccionados.map((id) => (
                <input key={id} type="hidden" name="planes_ids" value={id} />
              ))}

              {!hayAlgo && (
                <p className="nota-campo" style={{ color: 'var(--accent)' }}>
                  Marca al menos un plan, o desmarca «pagado en efectivo» para dar de alta sin acceso.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
