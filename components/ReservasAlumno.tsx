'use client'

// Calendario de reservas del alumno presencial: sus próximas clases, un
// calendario mensual para elegir el día, y los turnos del día elegido.
// Reservar y cancelar piden confirmación en una ventana propia: un toque
// sin querer en el móvil no puede coger ni soltar una plaza.
// Las reglas las aplica la BBDD; aquí solo se pinta el estado y se enseña
// el mensaje que devuelva.
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reservarTurno, cancelarTurno } from '@/app/reservas/actions'
import { sumarDias } from '@/lib/evaluaciones'
import {
  aHora,
  aMinutos,
  celdasMes,
  fmtFechaLarga,
  fmtMesAnio,
  type ConfigReservas,
  type DiaTurnos,
} from '@/lib/reservas'
import ModalConfirmar from '@/components/ModalConfirmar'

export type ProximaClase = { id: string; fecha: string; hora: string; cancelable: boolean }

type Confirmacion =
  | { tipo: 'reservar'; fecha: string; hora: string }
  | { tipo: 'cancelar'; id: string; fecha: string; hora: string }

const CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type Celda = {
  fecha: string
  dia: number
  fuera: boolean // de otro mes
  abierto: boolean // tiene turnos y está dentro de la ventana
  libres: number
  mia: boolean
}

/** La rejilla del mes (geometría, lib/reservas.ts) + los datos de cada día */
function celdasDelMes(y: number, m: number, porFecha: Map<string, DiaTurnos>): Celda[] {
  return celdasMes(y, m).map((c) => {
    const d = porFecha.get(c.fecha)
    return {
      ...c,
      abierto: !!d,
      libres: d ? d.turnos.filter((t) => t.estado === 'libre').length : 0,
      mia: d ? d.turnos.some((t) => t.estado === 'mia') : false,
    }
  })
}

export default function ReservasAlumno({
  dias,
  proximas,
  config,
  desde,
  numDias,
}: {
  /** Solo los días con horario (los cerrados no vienen) */
  dias: DiaTurnos[]
  proximas: ProximaClase[]
  config: ConfigReservas
  /** Hoy (Madrid), primer día reservable */
  desde: string
  /** Cuántos días abarca la ventana de reserva */
  numDias: number
}) {
  const [pendiente, empezar] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const router = useRouter()

  const porFecha = useMemo(() => new Map(dias.map((d) => [d.fecha, d])), [dias])

  // Día elegido: el primero con plazas; si no hay ninguno, el primero abierto
  const [seleccionado, setSeleccionado] = useState<string>(
    () =>
      dias.find((d) => d.turnos.some((t) => t.estado === 'libre'))?.fecha ?? dias[0]?.fecha ?? desde
  )
  const dia = porFecha.get(seleccionado)

  // Mes visible, acotado a los meses que toca la ventana de reserva
  const ultimo = sumarDias(desde, numDias - 1)
  const mesMin = desde.slice(0, 7)
  const mesMax = ultimo.slice(0, 7)
  const [mes, setMes] = useState(() => seleccionado.slice(0, 7))
  const [y, m] = mes.split('-').map(Number)
  const celdas = useMemo(() => celdasDelMes(y, m, porFecha), [y, m, porFecha])
  const moverMes = (delta: number) => {
    const f = new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
    if (f >= mesMin && f <= mesMax) setMes(f)
  }

  // Lo que se ejecuta al confirmar en la ventana
  const ejecutar = () => {
    if (!confirmacion) return
    const c = confirmacion
    setAviso(null)
    empezar(async () => {
      const res =
        c.tipo === 'reservar' ? await reservarTurno(c.fecha, c.hora) : await cancelarTurno(c.id)
      setConfirmacion(null)
      if (res.ok) {
        setAviso({
          tipo: 'ok',
          texto:
            c.tipo === 'reservar'
              ? `Clase reservada: ${fmtFechaLarga(c.fecha)} a las ${c.hora}.`
              : 'Clase cancelada. La plaza queda libre para otro compañero.',
        })
        router.refresh()
      } else {
        setAviso({
          tipo: 'error',
          texto: res.error ?? (c.tipo === 'reservar' ? 'No se pudo reservar' : 'No se pudo cancelar'),
        })
      }
    })
  }

  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
  const horaFin = (hora: string) => aHora(aMinutos(hora) + config.duracion_min)
  const libresDia = dia ? dia.turnos.filter((t) => t.estado === 'libre').length : 0

  return (
    <div className="rsv">
      <p className="rsv-intro">
        Clases de {config.duracion_min} minutos con tu preparador, en el centro. Puedes reservar con
        hasta {plural(config.antelacion_max_dias, 'día', 'días')} de antelación y cancelar hasta{' '}
        {plural(config.cancelacion_min_horas, 'hora', 'horas')} antes.
        {config.max_por_dia === 1
          ? ' Una clase por día.'
          : ` Máximo ${config.max_por_dia} clases por día.`}
      </p>

      {aviso && <div className={`rsv-msg ${aviso.tipo}`}>{aviso.texto}</div>}

      {/* Próximas clases */}
      <section className="rsv-proximas">
        <h2>Tus próximas clases</h2>
        {proximas.length === 0 ? (
          <p className="rsv-vacio">No tienes ninguna clase reservada. Elige un día y un turno.</p>
        ) : (
          proximas.map((p) => (
            <div key={p.id} className="rsv-proxima">
              <div>
                <strong>{fmtFechaLarga(p.fecha)}</strong> · {p.hora}–{horaFin(p.hora)}
              </div>
              <button
                type="button"
                className="rsv-cancelar"
                onClick={() =>
                  setConfirmacion({ tipo: 'cancelar', id: p.id, fecha: p.fecha, hora: p.hora })
                }
                disabled={!p.cancelable || pendiente}
                title={
                  p.cancelable
                    ? 'Cancelar esta clase'
                    : `Ya no se puede cancelar (menos de ${config.cancelacion_min_horas} h)`
                }
              >
                Cancelar
              </button>
            </div>
          ))
        )}
      </section>

      {dias.length === 0 ? (
        <div className="al-vacio">
          <div className="al-vacio-icono">📅</div>
          <h2>No hay turnos abiertos</h2>
          <p>Tu preparador aún no ha abierto el horario de clases. Vuelve a mirar más adelante.</p>
        </div>
      ) : (
        <div className="rsv-panel">
          {/* Calendario mensual */}
          <section className="rsv-cal" aria-label="Calendario">
            <div className="rsv-cal-cab">
              <span className="rsv-cal-mes">{fmtMesAnio(`${mes}-01`)}</span>
              <div className="rsv-cal-nav">
                <button
                  type="button"
                  onClick={() => moverMes(-1)}
                  disabled={mes <= mesMin}
                  aria-label="Mes anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moverMes(1)}
                  disabled={mes >= mesMax}
                  aria-label="Mes siguiente"
                >
                  ›
                </button>
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
                  c.fecha === desde ? 'hoy' : '',
                  c.fecha === seleccionado ? 'activo' : '',
                  !c.abierto ? 'cerrado' : '',
                  c.abierto && c.libres === 0 && !c.mia ? 'completo' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    key={c.fecha}
                    type="button"
                    className={clases}
                    disabled={!c.abierto}
                    onClick={() => setSeleccionado(c.fecha)}
                    aria-pressed={c.fecha === seleccionado}
                    title={
                      c.abierto
                        ? `${fmtFechaLarga(c.fecha)} · ${c.libres === 0 ? 'completo' : plural(c.libres, 'turno libre', 'turnos libres')}`
                        : undefined
                    }
                  >
                    <span className="rsv-cal-num">{c.dia}</span>
                    {c.abierto && (
                      <span className={`rsv-cal-dot ${c.mia ? 'mia' : c.libres > 0 ? 'libre' : ''}`} />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="rsv-leyenda">
              <span>
                <i className="rsv-cal-dot libre" /> con plazas
              </span>
              <span>
                <i className="rsv-cal-dot mia" /> tu clase
              </span>
              <span>
                <i className="rsv-cal-dot" /> completo
              </span>
            </div>
          </section>

          {/* Turnos del día elegido */}
          <section className="rsv-dia">
            {dia ? (
              <>
                <div className="rsv-dia-cab">
                  <h2>{fmtFechaLarga(dia.fecha)}</h2>
                  <span className="al-cat-num">
                    {libresDia === 0
                      ? 'sin plazas'
                      : `${plural(libresDia, 'turno', 'turnos')} con plazas`}
                  </span>
                </div>
                <div className="rsv-turnos">
                  {dia.turnos.map((t) => {
                    const libresTurno = t.plazas - t.ocupadas

                    if (t.estado === 'mia') {
                      return (
                        <button
                          key={t.hora}
                          type="button"
                          className="rsv-turno mia"
                          onClick={() =>
                            t.reservaId &&
                            setConfirmacion({
                              tipo: 'cancelar',
                              id: t.reservaId,
                              fecha: dia.fecha,
                              hora: t.hora,
                            })
                          }
                          disabled={!t.cancelable || pendiente}
                          title={t.cancelable ? 'Pulsa para cancelar' : 'Ya no se puede cancelar'}
                        >
                          <strong>{t.hora}</strong>
                          <span>Reservada ✓</span>
                        </button>
                      )
                    }
                    if (t.estado === 'libre') {
                      return (
                        <button
                          key={t.hora}
                          type="button"
                          className="rsv-turno"
                          onClick={() =>
                            setConfirmacion({ tipo: 'reservar', fecha: dia.fecha, hora: t.hora })
                          }
                          disabled={pendiente}
                        >
                          <strong>{t.hora}</strong>
                          <span>{plural(libresTurno, 'plaza libre', 'plazas libres')}</span>
                        </button>
                      )
                    }
                    return (
                      <button
                        key={t.hora}
                        type="button"
                        className={`rsv-turno ${t.estado}`}
                        disabled
                        title={t.motivo ?? undefined}
                      >
                        <strong>{t.hora}</strong>
                        <span>
                          {t.estado === 'completo'
                            ? 'Completo'
                            : t.estado === 'bloqueado'
                              ? 'No disponible'
                              : 'Pasado'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="rsv-vacio">Elige un día en el calendario.</p>
            )}
          </section>
        </div>
      )}

      {/* Confirmación de reserva / cancelación */}
      {confirmacion && (
        <ModalConfirmar
          titulo={confirmacion.tipo === 'reservar' ? '¿Reservar esta clase?' : '¿Cancelar esta clase?'}
          textoConfirmar={confirmacion.tipo === 'reservar' ? 'Sí, reservar' : 'Sí, cancelar'}
          textoCancelar="Volver"
          peligro={confirmacion.tipo === 'cancelar'}
          pendiente={pendiente}
          onConfirmar={ejecutar}
          onCerrar={() => setConfirmacion(null)}
        >
          <div className="cf-resumen">
            <strong>{fmtFechaLarga(confirmacion.fecha)}</strong>
            <span>
              {confirmacion.hora}–{horaFin(confirmacion.hora)} · {config.duracion_min} min en el
              centro
            </span>
          </div>
          <p>
            {confirmacion.tipo === 'reservar'
              ? `Ocuparás una plaza del turno. Podrás cancelarla hasta ${plural(
                  config.cancelacion_min_horas,
                  'hora',
                  'horas'
                )} antes.`
              : 'La plaza quedará libre para otro compañero. Si cambias de idea, tendrás que volver a reservar.'}
          </p>
        </ModalConfirmar>
      )}
    </div>
  )
}
