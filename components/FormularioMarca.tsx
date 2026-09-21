'use client'

// Formulario para apuntar la marca del día.
// Se adapta a lo que mide la categoría (igual que el cuestionario inicial):
//   · repeticiones -> nº de reps
//   · peso         -> kg (y reps opcionales)
//   · distancia    -> distancia en su unidad (+ tiempo si quiere)
//   · tiempo       -> minutos y segundos
// Los parciales por 100 m solo aparecen en carrera y tiempo.
import { useActionState, useState } from 'react'
import { guardarMarca, type EstadoMarca } from '@/app/registro/actions'
import { admiteParciales } from '@/lib/marcas'

export type CategoriaMarca = {
  id: string
  nombre: string
  metrica: string
  unidad: string
}

const inicial: EstadoMarca = {}

export default function FormularioMarca({
  categorias,
  categoriaFija,
  ejercicioId,
  titulo = 'Apuntar marca de hoy',
}: {
  categorias: CategoriaMarca[]
  categoriaFija?: string
  ejercicioId?: string
  /** Vacío = sin cabecera ni caja propias (lo envuelve otro bloque) */
  titulo?: string
}) {
  const [estado, accion, pendiente] = useActionState(guardarMarca, inicial)

  // Tras guardar con éxito, el formulario se REINICIA (key nueva). Un contador
  // que sube en cada guardado correcto, ajustado en render, en vez de una
  // clave aleatoria (impura: cambiaba en cada render y en los errores).
  const [guardadas, setGuardadas] = useState(0)
  const [estadoVisto, setEstadoVisto] = useState(estado)
  if (estado !== estadoVisto) {
    setEstadoVisto(estado)
    if (estado.ok) setGuardadas((g) => g + 1)
  }

  const [catId, setCatId] = useState(categoriaFija ?? categorias[0]?.id ?? '')
  const [parciales, setParciales] = useState<{ metros: number; seg: string }[]>([])

  const cat = categorias.find((c) => c.id === catId)
  const metrica = cat?.metrica ?? 'repeticiones'
  const unidad = cat?.unidad ?? 'reps'
  const conParciales = admiteParciales(metrica)

  const hoy = new Date().toISOString().slice(0, 10)

  const anadirParcial = () =>
    setParciales((p) => [...p, { metros: (p.length + 1) * 100, seg: '' }])
  const quitarParcial = (i: number) =>
    setParciales((p) => p.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, metros: (idx + 1) * 100 })))
  const setSeg = (i: number, v: string) =>
    setParciales((p) => p.map((x, idx) => (idx === i ? { ...x, seg: v } : x)))

  if (categorias.length === 0) {
    return (
      <div className="marca-caja">
        <p className="marca-vacio">
          Cuando tengas ejercicios contratados podrás ir apuntando aquí tus marcas.
        </p>
      </div>
    )
  }

  return (
    <form action={accion} className={`marca-caja ${titulo ? "" : "embebida"}`} key={`form-${guardadas}`}>
      <div className={`marca-cab ${titulo ? '' : 'sin-titulo'}`}>
        {titulo ? <h3>{titulo}</h3> : <span />}
        <input type="date" name="fecha" defaultValue={hoy} max={hoy} className="marca-fecha" />
      </div>

      {/* Datos que necesita el servidor para interpretar los valores */}
      <input type="hidden" name="categoria_id" value={catId} />
      <input type="hidden" name="metrica" value={metrica} />
      <input type="hidden" name="unidad" value={unidad} />
      {ejercicioId && <input type="hidden" name="ejercicio_id" value={ejercicioId} />}

      {/* Selector de ejercicio (solo si no viene fijado) */}
      {!categoriaFija && (
        <div className="marca-campo">
          <label htmlFor="cat">Ejercicio</label>
          <select id="cat" value={catId} onChange={(e) => setCatId(e.target.value)}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Campos según la métrica */}
      <div className="marca-fila">
        {metrica === 'repeticiones' && (
          <div className="marca-campo">
            <label htmlFor="reps">Repeticiones</label>
            <div className="marca-input-uni">
              <input type="number" id="reps" name="repeticiones" min={0} placeholder="0" />
              <span>{unidad}</span>
            </div>
          </div>
        )}

        {metrica === 'peso' && (
          <>
            <div className="marca-campo">
              <label htmlFor="peso">Peso</label>
              <div className="marca-input-uni">
                <input type="number" id="peso" name="peso_kg" min={0} step="0.5" placeholder="0" />
                <span>kg</span>
              </div>
            </div>
            <div className="marca-campo">
              <label htmlFor="repsp">Repeticiones</label>
              <div className="marca-input-uni">
                <input type="number" id="repsp" name="repeticiones" min={0} placeholder="opcional" />
                <span>reps</span>
              </div>
            </div>
          </>
        )}

        {metrica === 'distancia' && (
          <div className="marca-campo">
            <label htmlFor="dist">Distancia</label>
            <div className="marca-input-uni">
              <input
                type="number"
                id="dist"
                name="distancia"
                min={0}
                step={unidad === 'm' ? 10 : 0.1}
                placeholder="0"
              />
              <span>{unidad}</span>
            </div>
          </div>
        )}

        {(metrica === 'tiempo' || metrica === 'distancia') && (
          <div className="marca-campo">
            <label>{metrica === 'distancia' ? 'Tiempo (opcional)' : 'Tiempo'}</label>
            <div className="marca-tiempo">
              <div className="marca-input-uni">
                <input type="number" name="tiempo_min" min={0} placeholder="0" />
                <span>min</span>
              </div>
              <div className="marca-input-uni">
                <input type="number" name="tiempo_seg" min={0} max={59} step="0.1" placeholder="0" />
                <span>seg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parciales por 100 m: solo carrera y tiempo */}
      {conParciales && (
        <div className="marca-parciales">
          <div className="marca-parciales-cab">
            <span>Parciales por 100 m</span>
            <button type="button" onClick={anadirParcial} className="marca-add">
              + Añadir tramo
            </button>
          </div>

          {parciales.length === 0 ? (
            <p className="marca-parciales-vacio">
              Si has hecho la prueba en pista, puedes desglosar el tiempo de cada 100 m.
            </p>
          ) : (
            <div className="marca-parciales-lista">
              {parciales.map((p, i) => (
                <div key={i} className="marca-parcial">
                  <span className="marca-parcial-m">{p.metros} m</span>
                  <input type="hidden" name="parcial_metros" value={p.metros} />
                  <div className="marca-input-uni">
                    <input
                      type="number"
                      name="parcial_segundos"
                      min={0}
                      step="0.01"
                      value={p.seg}
                      onChange={(e) => setSeg(i, e.target.value)}
                      placeholder="0"
                    />
                    <span>seg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarParcial(i)}
                    className="marca-quitar"
                    aria-label="Quitar tramo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="marca-campo">
        <label htmlFor="notas">Notas (opcional)</label>
        <textarea id="notas" name="notas" rows={2} placeholder="Cómo te has encontrado, sensaciones…" />
      </div>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && <p className="form-exito">Marca guardada ✓</p>}

      <button type="submit" className="marca-guardar" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Guardar marca'}
      </button>
    </form>
  )
}
