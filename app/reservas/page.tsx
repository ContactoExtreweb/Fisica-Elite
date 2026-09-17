// Reservar clase — solo para alumnos PRESENCIALES (marca que pone el
// admin en la ficha). Un alumno online que entre aquí ve un aviso, y
// aunque manipulase la página, la función de BBDD no le deja reservar.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { contarNoLeidos } from '@/lib/no-leidos'
import { hoyMadrid, sumarDias } from '@/lib/evaluaciones'
import {
  cargarCalendario,
  calendarioAlumno,
  modoAlumno,
  horaCorta,
  type Reserva,
} from '@/lib/reservas'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import ReservasAlumno, { type ProximaClase } from '@/components/ReservasAlumno'

export const metadata = { title: 'Reservar clase' }

// Ventana máxima que se carga; la real la marca config.antelacion_max_dias
const VENTANA_DIAS = 31

export default async function ReservasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: perfil }, noLeidos, modo] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos').eq('id', user.id).single(),
    contarNoLeidos(),
    modoAlumno(supabase, user.id),
  ])

  const nombreCompleto = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

  // Solo se calcula el calendario si es presencial: un alumno online no
  // necesita ni la ocupación de los turnos.
  let contenido: React.ReactNode
  if (!modo.presencial) {
    contenido = (
      <div className="al-vacio">
        <div className="al-vacio-icono">🏋️</div>
        <h2>Esta sección es para alumnos presenciales</h2>
        <p>
          Si vienes a entrenar al centro, dile a tu preparador que active tus reservas y aquí verás
          el calendario para coger turno.
        </p>
        <Link href="/chat" className="cta-primary">
          Hablar con mi preparador
        </Link>
      </div>
    )
  } else {
    const hoy = hoyMadrid()
    const hasta = sumarDias(hoy, VENTANA_DIAS)
    const [cal, { data: miasRaw }] = await Promise.all([
      cargarCalendario(supabase, hoy, hasta),
      supabase
        .from('reservas')
        .select('id, fecha, hora, estado')
        .eq('user_id', user.id)
        .eq('estado', 'activa')
        .gte('fecha', hoy)
        .order('fecha')
        .order('hora'),
    ])
    const mias = (miasRaw ?? []) as Reserva[]
    const dias = calendarioAlumno({
      ...cal,
      mias,
      desde: hoy,
      dias: Math.min(cal.config.antelacion_max_dias + 1, VENTANA_DIAS),
    })

    // Próximas clases con si aún se pueden cancelar (lo calcula el calendario)
    const cancelables = new Map<string, boolean>()
    for (const d of dias) for (const t of d.turnos) if (t.reservaId) cancelables.set(t.reservaId, !!t.cancelable)
    const proximas: ProximaClase[] = mias.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      hora: horaCorta(r.hora),
      cancelable: cancelables.get(r.id) ?? false,
    }))

    contenido = (
      <ReservasAlumno
        dias={dias}
        proximas={proximas}
        config={cal.config}
        desde={hoy}
        numDias={Math.min(cal.config.antelacion_max_dias + 1, VENTANA_DIAS)}
      />
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICAS<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>
        <NavAlumno
          noLeidos={noLeidos}
          presencial={modo.presencial}
          soloPresencial={modo.presencial && !modo.online}
        />
        <div className="sidebar-foot">
          <div className="avatar">{iniciales}</div>
          <div>
            <div className="who">{nombreCompleto}</div>
            <BotonLogout variante="texto" />
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar-movil">
          <div className="topbar-movil-marca">
            FÍSICAS<span className="accent">.</span>ELITE
          </div>
          <BotonLogout variante="icono" />
        </div>

        <div className="al-cab">
          <div>
            <div className="al-saludo">Clases en el centro</div>
            <h1 className="al-titulo">
              Reserva tu <em>turno.</em>
            </h1>
          </div>
        </div>

        {contenido}
      </main>
    </div>
  )
}
