// Tarjetas de "lo que tengo contratado". Se usa en /suscripcion (completo,
// con historial y con renovar por plan) y en /perfil (solo lo vigente, en
// modo resumen y sin acciones).
//
// Es presentacional: no consulta nada, recibe ya las filas de
// lib/suscripciones.ts. Así las dos páginas enseñan exactamente lo mismo.
import type { SuscripcionAlumno } from '@/lib/suscripciones'
import RenovarOnline from '@/components/RenovarOnline'

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

function Tarjeta({ s, permitirRenovar }: { s: SuscripcionAlumno; permitirRenovar: boolean }) {
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

      {/* Renovar ESTE plan (solo en /suscripcion). <details> nativo: se
          despliega sin JS y no añade estado a la página. */}
      {permitirRenovar && s.renovable && s.plan && s.precioCentimos !== null && (
        <details className="susc-plan-renovar">
          <summary>{s.vigente ? 'Ampliar este plan' : 'Renovar este plan'}</summary>
          <RenovarOnline
            modo="renovar"
            suscripcionId={s.id}
            nombrePlan={s.plan}
            precioCentimos={s.precioCentimos}
          />
        </details>
      )}

      {permitirRenovar && !s.plan && !s.planIlegible && s.estado === 'activa' && (
        <p className="susc-plan-nota">
          Es una suscripción antigua sin plan asociado, así que no se puede
          renovar tal cual. Para seguir después de su fecha de fin, contrata un
          plan más abajo.
        </p>
      )}

      {permitirRenovar && s.estado === 'cancelada' && (
        <p className="susc-plan-nota">
          Dada de baja por tu preparador. Si quieres recuperarla, habla con él.
        </p>
      )}
    </div>
  )
}

export default function ListaSuscripciones({
  suscripciones,
  mostrarHistorial = true,
  permitirRenovar = false,
}: {
  suscripciones: SuscripcionAlumno[]
  mostrarHistorial?: boolean
  /** Botón de renovar en cada tarjeta. Solo en /suscripcion. */
  permitirRenovar?: boolean
}) {
  const vigentes = suscripciones.filter((s) => s.vigente)
  const pasadas = suscripciones.filter((s) => !s.vigente)

  if (vigentes.length === 0 && (!mostrarHistorial || pasadas.length === 0)) {
    return <p className="susc-plan-vacio">Todavía no tienes ningún plan contratado.</p>
  }

  return (
    <div className="susc-planes">
      {vigentes.map((s) => (
        <Tarjeta key={s.id} s={s} permitirRenovar={permitirRenovar} />
      ))}

      {mostrarHistorial && pasadas.length > 0 && (
        <>
          <div className="susc-planes-sep">Historial</div>
          {pasadas.map((s) => (
            <Tarjeta key={s.id} s={s} permitirRenovar={permitirRenovar} />
          ))}
        </>
      )}
    </div>
  )
}
