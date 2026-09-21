// Calendario mensual del admin para elegir el día de la agenda de
// reservas. A diferencia del calendario del alumno (components/
// ReservasAlumno.tsx), aquí no hay turnos que reservar ni días
// bloqueados por antelación: el admin puede mirar cualquier fecha,
// pasada o futura, así que es un componente de SERVIDOR sin estado — la
// navegación (mes, día) va por enlaces normales (?fecha=, ?mes=), igual
// que el resto del panel.
import Link from 'next/link'
import { celdasMes, fmtMesAnio } from '@/lib/reservas'

export type CeldaAgenda = {
  fecha: string
  dia: number
  fuera: boolean
  cerrado: boolean // sin horario ese día (fin de semana, etc.)
  bloqueado: boolean // día bloqueado a mano (festivo, vacaciones…)
  ocupadas: number // reservas activas ese día
}

const CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function CalendarioReservasAdmin({
  mes,
  fechaSeleccionada,
  hoy,
  porFecha,
  hrefFecha,
  hrefMes,
}: {
  /** 'YYYY-MM' visible */
  mes: string
  fechaSeleccionada: string
  hoy: string
  porFecha: Map<string, { bloqueado: boolean; ocupadas: number }>
  hrefFecha: (fecha: string) => string
  hrefMes: (mes: string) => string
}) {
  const [y, m] = mes.split('-').map(Number)
  const celdas: CeldaAgenda[] = celdasMes(y, m).map((c) => {
    const d = porFecha.get(c.fecha)
    return {
      ...c,
      cerrado: !d,
      bloqueado: d?.bloqueado ?? false,
      ocupadas: d?.ocupadas ?? 0,
    }
  })

  const mesAnterior = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7)
  const mesSiguiente = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)

  return (
    <div className="rsv-cal admin-cal">
      <div className="rsv-cal-cab">
        <span className="rsv-cal-mes">{fmtMesAnio(`${mes}-01`)}</span>
        <div className="rsv-cal-nav">
          <Link href={hrefMes(mesAnterior)} aria-label="Mes anterior">
            ‹
          </Link>
          {mes !== hoy.slice(0, 7) && (
            <Link href={hrefFecha(hoy)} className="admin-cal-hoy">
              Hoy
            </Link>
          )}
          <Link href={hrefMes(mesSiguiente)} aria-label="Mes siguiente">
            ›
          </Link>
        </div>
      </div>

      <div className="rsv-cal-grid">
        {CABECERA.map((l, i) => (
          <span key={i} className="rsv-cal-sem">
            {l}
          </span>
        ))}
        {celdas.map((c) => {
          const clases = [
            'rsv-cal-dia',
            c.fuera ? 'fuera' : '',
            c.fecha === hoy ? 'hoy' : '',
            c.fecha === fechaSeleccionada ? 'activo' : '',
            c.cerrado ? 'cerrado' : '',
            c.bloqueado ? 'bloqueado' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return c.fuera ? (
            <span key={c.fecha} className={clases}>
              <span className="rsv-cal-num">{c.dia}</span>
            </span>
          ) : (
            <Link
              key={c.fecha}
              href={hrefFecha(c.fecha)}
              className={clases}
              aria-current={c.fecha === fechaSeleccionada ? 'date' : undefined}
              title={c.bloqueado ? 'Día bloqueado' : c.cerrado ? 'Cerrado' : undefined}
            >
              <span className="rsv-cal-num">{c.dia}</span>
              {c.ocupadas > 0 && <span className="admin-cal-n">{c.ocupadas}</span>}
              {c.bloqueado && <span className="rsv-cal-dot" aria-hidden="true" />}
            </Link>
          )
        })}
      </div>

      <div className="rsv-leyenda">
        <span>
          <i className="admin-cal-n admin-cal-n-ej">3</i> reservas ese día
        </span>
        <span>
          <i className="rsv-cal-dot" /> bloqueado
        </span>
      </div>
    </div>
  )
}
