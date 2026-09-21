// Panel de inicio del alumno.
//
// Antes esta página ERA la lista de ejercicios; esa lista se movió a
// /ejercicios (mismo contenido, ahora con su propia sección en el menú)
// y aquí queda un panel de verdad. El orden importa: lo primero que ve el
// alumno son SUS EJERCICIOS (por dónde va y el siguiente), que es a lo que
// viene; después los avisos (mensajes nuevos), los accesos a cada sección
// y el resumen con datos reales (qué tiene contratado y hasta cuándo, su
// próxima clase si es presencial, sus últimas marcas).
//
// "Continúa por donde lo dejaste" usa profiles.ultimo_ejercicio_id
// (migración 025, se apunta al abrir un ejercicio). Si nunca ha entrado
// a ninguno, no hay "continuar": se le ofrece directamente "el primero".
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import HistorialMarcas from '@/components/HistorialMarcas'
import { contarNoLeidos } from '@/lib/no-leidos'
import { misSuscripciones, accesoHasta } from '@/lib/suscripciones'
import { aHora, ahoraMadrid, horaCorta } from '@/lib/reservas'
import type { RegistroFila } from '@/lib/marcas'
import { hoyMadrid } from '@/lib/fechas'

export const metadata = { title: 'Inicio' }

type Fila = {
  id: string
  slug: string | null
  titulo: string
  descripcion: string | null
  video_id: string | null
  categoria_id: string
  categorias_ejercicio: { nombre: string; orden: number } | { nombre: string; orden: number }[] | null
}

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

function fmtFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export default async function InicioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = hoyMadrid()
  const ahora = ahoraMadrid()

  const [
    { data: perfil },
    { data: ejercicios },
    suscripciones,
    noLeidos,
    { data: registrosRecientes },
    { data: cats },
    { data: proximasReservas },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('nombre, apellidos, presencial, ultimo_ejercicio_id')
      .eq('id', user.id)
      .single(),
    // El listado ENTERO (sin filtrar por categoría): con esto se saca el
    // total, y con el mismo orden que ve el alumno en /ejercicios se
    // calcula "el siguiente" a partir del último que abrió.
    supabase
      .from('ejercicios')
      .select('id, slug, titulo, descripcion, video_id, categoria_id, categorias_ejercicio(nombre, orden), orden')
      .eq('publicado', true)
      .eq('explicativo', false)
      .order('orden'),
    misSuscripciones(supabase, user.id),
    contarNoLeidos(),
    supabase
      .from('registros_entrenamiento')
      .select('id, fecha, repeticiones, peso_kg, distancia_km, tiempo_seg, series, notas, categoria_id')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('categorias_ejercicio').select('id, nombre, metrica, unidad'),
    // Unas cuantas próximas (no solo 1): puede que la primera fila ya
    // haya pasado hoy mismo, y de aquí se queda con la primera futura.
    supabase
      .from('reservas')
      .select('id, fecha, hora')
      .eq('user_id', user.id)
      .eq('estado', 'activa')
      .gte('fecha', hoy)
      .order('fecha')
      .order('hora')
      .limit(5),
  ])

  const vigentes = suscripciones.filter((s) => s.vigente)
  const tieneAcceso = vigentes.length > 0

  // Alumno SOLO presencial (paga en mano, sin plan online): su inicio es
  // el calendario de reservas, no un panel de ejercicios vacío.
  if (perfil?.presencial && !tieneAcceso) redirect('/reservas')

  // Mensajes nuevos: solo si de verdad hay alguno sin leer (si no, no se
  // enseña la fila — nada de "0 mensajes nuevos" ocupando sitio).
  let ultimoMensaje: string | null = null
  if (noLeidos > 0) {
    const { data: conv } = await supabase
      .from('conversaciones')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (conv) {
      const { data: msg } = await supabase
        .from('mensajes')
        .select('contenido')
        .eq('conversacion_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      ultimoMensaje = msg?.contenido ?? null
    }
  }

  // La primera reserva que de verdad sigue por delante (si la de hoy ya
  // pasó de hora, no cuenta). Comparación como texto 'HH:MM': con los
  // dos con ceros delante, ordena igual que por minutos.
  const horaActual = aHora(ahora.minutos)
  const proximaClase = (proximasReservas ?? []).find(
    (r) => r.fecha > ahora.fecha || (r.fecha === ahora.fecha && horaCorta(r.hora) > horaActual)
  )

  // Mismo orden que ve el alumno en /ejercicios: por categoría, y dentro
  // de cada categoría por su propio orden.
  const lista = ((ejercicios ?? []) as Fila[])
    .map((e) => ({ ...e, catOrden: rel(e.categorias_ejercicio)?.orden ?? 999 }))
    .sort((a, b) => a.catOrden - b.catOrden || 0)

  const idxActual = perfil?.ultimo_ejercicio_id
    ? lista.findIndex((e) => e.id === perfil.ultimo_ejercicio_id)
    : -1
  const actual = idxActual >= 0 ? lista[idxActual] : null
  const siguiente =
    idxActual >= 0 && idxActual < lista.length - 1
      ? lista[idxActual + 1]
      : idxActual === -1 && lista.length > 0
        ? lista[0] // nunca ha abierto ninguno: "el siguiente" es el primero
        : null

  // La tarjeta grande: por donde iba; y si nunca abrió ninguno, el primero.
  const destacado = actual ?? siguiente

  const nombreCorto = (perfil?.nombre ?? '').trim().split(' ')[0]
  const nombreCompleto = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

  const finAcceso = accesoHasta(suscripciones)
  const textoAcceso =
    vigentes.length === 0
      ? 'Sin acceso'
      : vigentes.length === 1
        ? vigentes[0].titulo
        : `${vigentes.length} planes activos`

  // Fila ancha (icono + texto + flecha), la de "el siguiente": la tarjeta
  // grande es solo la de "continúa", así la página se lee de un vistazo y
  // no a base de scroll.
  const filaEjercicio = (e: Fila, etiqueta: string, clase: string) => (
    <Link href={`/ejercicio/${e.slug ?? e.id}`} className={`al-panel-todos ${clase}`}>
      <span className="al-panel-todos-icono">
        {e.video_id ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="al-panel-todos-txt">
        <strong>{e.titulo}</strong>
        <span>
          {etiqueta} · {rel(e.categorias_ejercicio)?.nombre ?? 'Ejercicio'}
        </span>
      </span>
      <span className="al-panel-todos-flecha">→</span>
    </Link>
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICAS<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>
        <NavAlumno noLeidos={noLeidos} presencial={!!perfil?.presencial} />
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
            <div className="al-saludo">{nombreCorto ? `Hola, ${nombreCorto}` : 'Hola'}</div>
            <h1 className="al-titulo">
              Tu <em>entrenamiento.</em>
            </h1>
          </div>
          <Link href="/perfil" className="al-perfil-link">
            Mi perfil
          </Link>
        </div>

        {!tieneAcceso ? (
          <div className="al-vacio">
            <div className="al-vacio-icono">🔒</div>
            <h2>Tu acceso no está activo</h2>
            <p>
              En cuanto tu preparador active tu suscripción, aquí verás tu entrenamiento.
            </p>
            <Link href="/chat" className="cta-primary">
              Hablar con mi preparador
            </Link>
          </div>
        ) : (
          <>
            {/* 1 · EJERCICIOS, lo primero: es a lo que viene el alumno */}
            {lista.length === 0 ? (
              <div className="al-vacio">
                <div className="al-vacio-icono">💪</div>
                <h2>Aún no hay ejercicios para ti</h2>
                <p>
                  Tu preparador está preparando el contenido de tu nivel. En cuanto lo publique,
                  aparecerá aquí.
                </p>
                <Link href="/chat" className="cta-primary">
                  Hablar con mi preparador
                </Link>
              </div>
            ) : (
              <section className="al-ejercicios">
                <div className="al-cat-cab">
                  <h2>Tus ejercicios</h2>
                  <span className="al-cat-num">{lista.length} en total</span>
                </div>

                {destacado && (
                  <Link href={`/ejercicio/${destacado.slug ?? destacado.id}`} className="al-hero">
                    <span className="al-hero-cuerpo">
                      <span className="al-hero-etq">
                        {actual ? 'Continúa por donde lo dejaste' : 'Empieza aquí'}
                      </span>
                      <strong className="al-hero-titulo">{destacado.titulo}</strong>
                      <span className="al-hero-meta">
                        {rel(destacado.categorias_ejercicio)?.nombre ?? 'Ejercicio'}
                        {actual && ` · Ejercicio ${idxActual + 1} de ${lista.length}`}
                      </span>
                      {destacado.descripcion && (
                        <span className="al-hero-desc">{destacado.descripcion}</span>
                      )}
                      <span className="al-hero-cta">{actual ? 'Continuar' : 'Empezar'} →</span>
                    </span>
                    <span className="al-hero-play" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </Link>
                )}

                <div className="al-panel-lista">
                  {actual && siguiente && filaEjercicio(siguiente, 'El siguiente', 'siguiente')}

                  <Link href="/ejercicios" className="al-panel-todos">
                    <span className="al-panel-todos-icono">
                      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                      </svg>
                    </span>
                    <span className="al-panel-todos-txt">
                      <strong>Todos tus ejercicios</strong>
                      <span>{lista.length} en total, agrupados por categoría</span>
                    </span>
                    <span className="al-panel-todos-flecha">→</span>
                  </Link>
                </div>
              </section>
            )}

            {/* 2 · Aviso: solo si hay mensajes sin leer */}
            {ultimoMensaje && (
              <Link href="/chat" className="al-mensaje-nuevo">
                <span className="al-mensaje-nuevo-badge">
                  {noLeidos > 9 ? '9+' : noLeidos}
                </span>
                <span className="al-mensaje-nuevo-txt">
                  <strong>{noLeidos === 1 ? 'Mensaje nuevo de tu preparador' : 'Mensajes nuevos de tu preparador'}</strong>
                  <span>{ultimoMensaje}</span>
                </span>
                <span className="al-panel-todos-flecha">→</span>
              </Link>
            )}

            {/* 3 · Accesos al resto de la plataforma */}
            <div className="al-accesos">
              <Link href="/explicaciones" className="al-acceso">
                <span className="al-acceso-icono expl">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="al-acceso-txt">
                  <strong>Explicaciones</strong>
                  <span>Vídeos de técnica por movimiento</span>
                </span>
              </Link>

              {perfil?.presencial && (
                <Link href="/reservas" className="al-acceso">
                  <span className="al-acceso-icono rsv">
                    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="al-acceso-txt">
                    <strong>Reservar clase</strong>
                    <span>Coge tu turno en el centro</span>
                  </span>
                </Link>
              )}

              <Link href="/registro" className="al-acceso">
                <span className="al-acceso-icono prog">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M4 19V5m0 14h16M8 15V9m4 6V6m4 9v-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="al-acceso-txt">
                  <strong>Mi progreso</strong>
                  <span>Apunta la marca de hoy</span>
                </span>
              </Link>

              <Link href="/evaluaciones" className="al-acceso">
                <span className="al-acceso-icono ev">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M15 10l4.55-2.28A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.89L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="al-acceso-txt">
                  <strong>Pruebas reales</strong>
                  <span>Sube tu vídeo de evaluación</span>
                </span>
              </Link>

              <Link href="/chat" className="al-acceso">
                <span className="al-acceso-icono chat">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {noLeidos > 0 && <span className="al-acceso-badge">{noLeidos > 9 ? '9+' : noLeidos}</span>}
                </span>
                <span className="al-acceso-txt">
                  <strong>¿Tienes dudas?</strong>
                  <span>Habla con tu preparador</span>
                </span>
              </Link>

              <Link href="/perfil" className="al-acceso">
                <span className="al-acceso-icono perfil">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="al-acceso-txt">
                  <strong>Mi perfil</strong>
                  <span>Peso, altura y avisos</span>
                </span>
              </Link>
            </div>

            {/* 4 · Resumen: datos reales, no enlaces sueltos */}
            <div className="al-resumen">
              <div className="al-resumen-item">
                <span className="al-resumen-k">Tu acceso</span>
                <span className="al-resumen-v">
                  {textoAcceso}
                  {finAcceso && (
                    <>
                      {' '}
                      · hasta el{' '}
                      {new Date(finAcceso).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </>
                  )}
                </span>
              </div>
              {perfil?.presencial && proximaClase && (
                <Link href="/reservas" className="al-resumen-item clicable">
                  <span className="al-resumen-k">Tu próxima clase</span>
                  <span className="al-resumen-v">
                    {fmtFechaCorta(proximaClase.fecha)} · {horaCorta(proximaClase.hora)}
                  </span>
                </Link>
              )}
            </div>

            {/* 5 · Últimas marcas */}
            {(registrosRecientes ?? []).length > 0 && (
              <section className="al-marcas-mini">
                <div className="al-cat-cab">
                  <h2>Tus últimas marcas</h2>
                  <Link href="/registro" className="al-cat-expl">
                    Ver todo mi progreso →
                  </Link>
                </div>
                <HistorialMarcas
                  registros={(registrosRecientes ?? []) as RegistroFila[]}
                  categorias={cats ?? []}
                  soloLectura
                />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
