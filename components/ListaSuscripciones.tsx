// Tarjetas de "lo que tengo contratado". Se usa en /suscripcion (completo,
// con historial) y en /perfil (solo lo vigente, en modo resumen).
//
// Es presentacional: no consulta nada, recibe ya las filas de
// lib/suscripciones.ts. Así las dos páginas enseñan exactamente lo mismo.
import type { SuscripcionAlumno } from '@/lib/suscripciones'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function diasRestantes(iso: string | null): number | null {
  if (!iso) return null
  const hoy = new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  )
  const fin = new Date(iso)
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000)
}

function Tarjeta({ s }: { s: SuscripcionAlumno }) {
  const dias = s.vigente ? diasRestantes(s.fechaFin) : null
  const caduca = dias !== null && dias <= 14

  return (
    <div className={`susc-plan-card ${s.vigente ? '' : 'inactiva'}`}>
      <div className="susc-plan-cab">
        <div className="susc-plan-titulo">
          {s.titulo}
          {s.accesoTotal && <span className="susc-plan-etq total">Todo</span>}
          {s.tipo === 'oposicion' && <span className="susc-plan-etq opo">Oposición</span>}
        </div>
        <span className={`susc-plan-estado ${s.vigente ? 'ok' : 'off'}`}>
          {s.vigente ? 'Activa' : s.estado === 'cancelada' ? 'Cancelada' : 'Caducada'}
        </span>
      </div>

      <p className="susc-plan-cubre">{s.cubre}</p>

      {s.categorias.length > 0 && (
        <div className="susc-plan-cats">
          {s.categorias.map((c) => (
            <span key={c} className="susc-plan-cat">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="susc-plan-pie">
        <span>
          {s.vigente ? 'Hasta el ' : 'Terminó el '}
          <strong>{fmt(s.fechaFin)}</strong>
        </span>
        {s.fechaInicio && <span className="susc-plan-desde">desde el {fmt(s.fechaInicio)}</span>}
      </div>

      {caduca && dias !== null && (
        <div className="susc-plan-aviso">
          {dias <= 0
            ? 'Caduca hoy.'
            : `Te quedan ${dias} ${dias === 1 ? 'día' : 'días'} de acceso.`}
        </div>
      )}
    </div>
  )
}

export default function ListaSuscripciones({
  suscripciones,
  mostrarHistorial = true,
}: {
  suscripciones: SuscripcionAlumno[]
  mostrarHistorial?: boolean
}) {
  const vigentes = suscripciones.filter((s) => s.vigente)
  const pasadas = suscripciones.filter((s) => !s.vigente)

  if (vigentes.length === 0 && (!mostrarHistorial || pasadas.length === 0)) {
    return (
      <p className="susc-plan-vacio">
        Todavía no tienes ningún plan contratado.
      </p>
    )
  }

  return (
    <div className="susc-planes">
      {vigentes.map((s) => (
        <Tarjeta key={s.id} s={s} />
      ))}

      {mostrarHistorial && pasadas.length > 0 && (
        <>
          <div className="susc-planes-sep">Historial</div>
          {pasadas.map((s) => (
            <Tarjeta key={s.id} s={s} />
          ))}
        </>
      )}
    </div>
  )
}
