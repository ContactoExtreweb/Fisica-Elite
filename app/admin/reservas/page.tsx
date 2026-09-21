// Agenda de clases presenciales (admin): un calendario mensual para
// elegir el día (con el nº de reservas de cada uno) y, al lado, quién
// viene a cada turno de ese día — cancelar reservas, bloquear turnos o
// el día entero (festivos, vacaciones). El horario y el aforo se
// cambian en /admin/reservas/horario.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hoyMadrid } from '@/lib/evaluaciones'
import { cargarCalendario, horasDelDia, bloqueoDe, fmtFechaLarga, horaCorta } from '@/lib/reservas'
import BotonConfirmar from '@/components/BotonConfirmar'
import CalendarioReservasAdmin from '@/components/CalendarioReservasAdmin'
import { cancelarReservaAdmin, bloquear, desbloquear } from '@/app/admin/reservas/actions'

type Perfil = { nombre: string | null; apellidos: string | null; email: string | null; telefono: string | null }
type ReservaFila = { id: string; hora: string; user_id: string; profiles: Perfil | Perfil[] | null }

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const MES = /^\d{4}-\d{2}$/

/** Último día del mes 'YYYY-MM' */
function finDeMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; mes?: string }>
}) {
  const { fecha: fechaPedida, mes: mesPedido } = await searchParams
  const hoy = hoyMadrid()
  const fecha = fechaPedida && FECHA.test(fechaPedida) ? fechaPedida : hoy
  const mes = mesPedido && MES.test(mesPedido) ? mesPedido : fecha.slice(0, 7)
  const supabase = await createClient()

  const [cal, { data: reservasRaw }, { data: proximosBloqueos }, { data: reservasMes }, { data: bloqueosMes }] =
    await Promise.all([
      cargarCalendario(supabase, fecha, fecha),
      supabase
        .from('reservas')
        .select('id, hora, user_id, profiles(nombre, apellidos, email, telefono)')
        .eq('fecha', fecha)
        .eq('estado', 'activa')
        .order('hora'),
      supabase
        .from('bloqueos_reservas')
        .select('id, fecha, hora_inicio, hora_fin, motivo')
        .gte('fecha', hoy)
        .order('fecha')
        .order('hora_inicio')
        .limit(30),
      // Para los números del calendario: cuántas reservas activas hay
      // cada día del mes visible (no del día seleccionado, que puede
      // caer fuera de ese mes si se navegó con las flechas).
      supabase
        .from('reservas')
        .select('fecha')
        .eq('estado', 'activa')
        .gte('fecha', `${mes}-01`)
        .lte('fecha', finDeMes(mes)),
      supabase
        .from('bloqueos_reservas')
        .select('fecha, hora_inicio')
        .is('hora_inicio', null) // solo bloqueos de DÍA ENTERO, para el punto del calendario
        .gte('fecha', `${mes}-01`)
        .lte('fecha', finDeMes(mes)),
    ])

  const horas = horasDelDia(fecha, cal.horario, cal.config.duracion_min)
  const reservas = (reservasRaw ?? []) as ReservaFila[]
  const porHora = new Map<string, ReservaFila[]>()
  for (const r of reservas) {
    const h = horaCorta(r.hora)
    porHora.set(h, [...(porHora.get(h) ?? []), r])
  }
  const bloqueoDia = cal.bloqueos.find((b) => b.fecha === fecha && b.hora_inicio === null)

  // Datos del calendario: nº de reservas y si está bloqueado, por fecha
  const porFechaMes = new Map<string, { bloqueado: boolean; ocupadas: number }>()
  for (const r of reservasMes ?? []) {
    const prev = porFechaMes.get(r.fecha) ?? { bloqueado: false, ocupadas: 0 }
    porFechaMes.set(r.fecha, { ...prev, ocupadas: prev.ocupadas + 1 })
  }
  for (const b of bloqueosMes ?? []) {
    const prev = porFechaMes.get(b.fecha) ?? { bloqueado: false, ocupadas: 0 }
    porFechaMes.set(b.fecha, { ...prev, bloqueado: true })
  }

  const hrefFecha = (f: string) => `/admin/reservas?fecha=${f}&mes=${f.slice(0, 7)}`
  const hrefMes = (m: string) => `/admin/reservas?fecha=${fecha}&mes=${m}`

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">
            Clases presenciales · {reservas.length} {reservas.length === 1 ? 'reserva' : 'reservas'} este día
          </div>
          <h1 className="page-title">
            Agenda de <em>reservas.</em>
          </h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/reservas/horario" className="admin-topbar-cta">
            Horario y aforo
          </Link>
        </div>
      </div>

      <div className="rsv-panel">
        {/* Calendario mensual: pulsa un día para ver su agenda */}
        <CalendarioReservasAdmin
          mes={mes}
          fechaSeleccionada={fecha}
          hoy={hoy}
          porFecha={porFechaMes}
          hrefFecha={hrefFecha}
          hrefMes={hrefMes}
        />

        {/* Agenda del día elegido */}
        <div>
          <div className="agd-dia-cab">
            <h2 className="agd-fecha">{fmtFechaLarga(fecha)}</h2>
            {!bloqueoDia && horas.length > 0 && (
              <form action={bloquear} className="agd-dia-form">
                <input type="hidden" name="fecha" value={fecha} />
                <input
                  type="text"
                  name="motivo"
                  placeholder="Motivo (opcional): festivo, vacaciones…"
                  maxLength={120}
                />
                <BotonConfirmar
                  mensaje={`¿Bloquear el día entero (${fmtFechaLarga(fecha)})? Nadie podrá reservar. ${
                    reservas.length > 0
                      ? `Hay ${reservas.length} reserva(s) ya hechas: cancélalas a mano si hace falta.`
                      : ''
                  }`}
                  className="agd-btn peligro"
                >
                  Bloquear el día entero
                </BotonConfirmar>
              </form>
            )}
          </div>

          <div className="admin-section" style={{ padding: '8px 28px 20px' }}>
            {bloqueoDia ? (
              <div className="agd-turno">
                <div className="agd-hora">Todo el día</div>
                <div className="agd-bloq">
                  Día bloqueado{bloqueoDia.motivo ? ` · ${bloqueoDia.motivo}` : ''}
                </div>
                <div className="agd-acciones">
                  <form action={desbloquear}>
                    <input type="hidden" name="id" value={bloqueoDia.id} />
                    <input type="hidden" name="fecha" value={fecha} />
                    <button type="submit" className="agd-btn">
                      Desbloquear
                    </button>
                  </form>
                </div>
              </div>
            ) : horas.length === 0 ? (
              <div className="admin-tabla-vacia">Cerrado: este día no tiene horario de clases.</div>
            ) : (
              horas.map((hora) => {
                const lista = porHora.get(hora) ?? []
                const bloqueo = bloqueoDe(fecha, hora, cal.bloqueos)
                return (
                  <div key={hora} className="agd-turno">
                    <div className="agd-hora">
                      {hora}
                      <small>
                        {lista.length}/{cal.config.plazas_por_turno} plazas
                      </small>
                    </div>

                    <div>
                      {bloqueo && (
                        <div className="agd-bloq">
                          Turno bloqueado{bloqueo.motivo ? ` · ${bloqueo.motivo}` : ''}
                        </div>
                      )}
                      {lista.length === 0 ? (
                        !bloqueo && <div className="agd-vacio">Nadie apuntado todavía.</div>
                      ) : (
                        <ul className="agd-lista">
                          {lista.map((r) => {
                            const p = rel(r.profiles)
                            const nombre = [p?.nombre, p?.apellidos].filter(Boolean).join(' ') || 'Alumno'
                            return (
                              <li key={r.id}>
                                <div>
                                  <Link href={`/admin/alumnos/${r.user_id}`} className="name-link">
                                    {nombre}
                                  </Link>
                                  <span> · {p?.telefono || p?.email || ''}</span>
                                </div>
                                <form action={cancelarReservaAdmin}>
                                  <input type="hidden" name="id" value={r.id} />
                                  <input type="hidden" name="fecha" value={fecha} />
                                  <BotonConfirmar
                                    mensaje={`¿Cancelar la reserva de ${nombre} a las ${hora}?`}
                                    className="agd-btn peligro"
                                  >
                                    Cancelar
                                  </BotonConfirmar>
                                </form>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="agd-acciones">
                      {bloqueo ? (
                        bloqueo.hora_inicio !== null && (
                          <form action={desbloquear}>
                            <input type="hidden" name="id" value={bloqueo.id} />
                            <input type="hidden" name="fecha" value={fecha} />
                            <button type="submit" className="agd-btn">
                              Desbloquear
                            </button>
                          </form>
                        )
                      ) : (
                        <form action={bloquear}>
                          <input type="hidden" name="fecha" value={fecha} />
                          <input type="hidden" name="hora" value={hora} />
                          <BotonConfirmar
                            mensaje={`¿Bloquear el turno de las ${hora}? ${
                              lista.length > 0
                                ? 'Las reservas que ya hay se mantienen: cancélalas a mano si hace falta.'
                                : 'Nadie podrá reservarlo.'
                            }`}
                            className="agd-btn"
                          >
                            Bloquear turno
                          </BotonConfirmar>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Próximos bloqueos */}
      <div className="admin-section" style={{ marginTop: 24 }}>
        <div className="admin-section-head">
          <h3>Próximos bloqueos</h3>
        </div>
        <div className="admin-section-body">
          {(proximosBloqueos ?? []).length === 0 ? (
            <div className="agd-vacio">No hay ningún día ni turno bloqueado.</div>
          ) : (
            (proximosBloqueos ?? []).map((b) => (
              <div key={b.id} className="agd-fila-bloq">
                <div>
                  <Link href={hrefFecha(b.fecha)} className="name-link">
                    {fmtFechaLarga(b.fecha)}
                  </Link>{' '}
                  ·{' '}
                  {b.hora_inicio ? `${horaCorta(b.hora_inicio)}–${horaCorta(b.hora_fin)}` : 'todo el día'}
                  {b.motivo && <span className="agd-motivo"> · {b.motivo}</span>}
                </div>
                <form action={desbloquear}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="agd-btn">
                    Quitar
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
