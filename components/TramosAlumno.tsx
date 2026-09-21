'use client'

// Nivel (tramo) del alumno en cada categoría que tiene contratada, con la
// posibilidad de corregirlo desde su ficha. Ver app/admin/alumnos/tramos-actions.ts.
import { useActionState } from 'react'
import {
  asignarTramo,
  devolverTramoAlAlumno,
  type EstadoTramo,
} from '@/app/admin/alumnos/tramos-actions'

export type TramoOpcion = { id: string; nombre: string }

export type FilaTramoAlumno = {
  categoriaId: string
  categoriaNombre: string
  tramos: TramoOpcion[]
  /** Fila de alumno_tramos, o null si aún no hay ninguna */
  actual: { tramoId: string | null; origen: string } | null
}

const inicial: EstadoTramo = {}

function Fila({ alumnoId, fila }: { alumnoId: string; fila: FilaTramoAlumno }) {
  const [estado, guardar, guardando] = useActionState(asignarTramo, inicial)
  const [estadoDevolver, devolver, devolviendo] = useActionState(devolverTramoAlAlumno, inicial)

  const { actual, tramos } = fila
  const fijadoPorAdmin = actual?.origen === 'admin'
  const valorInicial = !actual ? '' : actual.tramoId === null ? 'todos' : actual.tramoId
  const nombreActual = !actual
    ? 'Sin asignar (ve el más básico)'
    : actual.tramoId === null
      ? 'Todos los tramos'
      : (tramos.find((t) => t.id === actual.tramoId)?.nombre ?? 'Tramo')

  // `key` cambia si cambia lo guardado: el select se reinicia al valor real
  const clave = `${fila.categoriaId}:${valorInicial}:${actual?.origen ?? ''}`

  return (
    <div className="tra-fila">
      <div className="tra-info">
        <div className="tra-cat">{fila.categoriaNombre}</div>
        <div className="tra-actual">
          <strong>{nombreActual}</strong>
          {actual && (
            <span className={`tra-origen ${fijadoPorAdmin ? 'admin' : ''}`}>
              {fijadoPorAdmin ? 'Fijado por ti' : 'Su autoevaluación'}
            </span>
          )}
        </div>
      </div>

      <form action={guardar} className="tra-form" key={clave}>
        <input type="hidden" name="alumno_id" value={alumnoId} />
        <input type="hidden" name="categoria_id" value={fila.categoriaId} />
        <select name="tramo" defaultValue={valorInicial} aria-label={`Tramo en ${fila.categoriaNombre}`}>
          <option value="" disabled>
            Elige tramo…
          </option>
          {tramos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
          <option value="todos">Todos los tramos</option>
        </select>
        <button type="submit" className="tra-guardar" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>

      {(estado.error || estadoDevolver.error) && (
        <p className="form-error tra-msg">{estado.error ?? estadoDevolver.error}</p>
      )}
      {estado.ok && !estado.error && <p className="form-exito tra-msg">Guardado ✓</p>}

      {fijadoPorAdmin && (
        <form action={devolver} className="tra-devolver">
          <input type="hidden" name="alumno_id" value={alumnoId} />
          <input type="hidden" name="categoria_id" value={fila.categoriaId} />
          <button type="submit" disabled={devolviendo}>
            Devolver la decisión al alumno
          </button>
        </form>
      )}
    </div>
  )
}

export default function TramosAlumno({
  alumnoId,
  filas,
}: {
  alumnoId: string
  filas: FilaTramoAlumno[]
}) {
  if (filas.length === 0) {
    return (
      <div className="admin-tabla-vacia">
        Este alumno no tiene ninguna categoría contratada, así que no hay tramos que asignar.
      </div>
    )
  }
  return (
    <div className="tra-lista">
      {filas.map((f) => (
        <Fila key={f.categoriaId} alumnoId={alumnoId} fila={f} />
      ))}
      <p className="ff-hint tra-nota">
        Lo que fijes aquí no lo pisa el alumno si repite el cuestionario. Con «Todos los tramos» ve
        los ejercicios de todos los niveles de esa categoría.
      </p>
    </div>
  )
}
