// "Pruebas reales": cada 6 semanas el alumno se graba haciendo la prueba
// de verdad y su preparador la corrige.
//
// Es lo que pidió el cliente para que las marcas de la plataforma no sean
// solo lo que el alumno dice, sino algo que se ve.
//
// Solo aparecen las categorías que tiene CONTRATADAS: no tiene sentido
// pedirle un vídeo de natación a quien solo ha comprado dominadas.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import SubirEvaluacion from '@/components/SubirEvaluacion'
import BorrarEvaluacion from '@/components/BorrarEvaluacion'
import { contarNoLeidos } from '@/lib/no-leidos'
import { categoriasContratadas } from '@/lib/acceso'
import {
  misEvaluaciones,
  calendarioPorCategoria,
  ventanasActivas,
} from '@/lib/evaluaciones'
import { bunnyConfigurado, urlEmbedFirmada } from '@/lib/bunny'

export const metadata = { title: 'Pruebas reales' }

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function EvaluacionesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: perfil }, categorias, evaluaciones, ventanas, noLeidos] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos, presencial').eq('id', user.id).single(),
    categoriasContratadas(supabase, user.id),
    misEvaluaciones(supabase, user.id),
    ventanasActivas(supabase),
    contarNoLeidos(),
  ])

  const calendario = calendarioPorCategoria(categorias, evaluaciones, ventanas)
  const puede = calendario.filter((c) => c.puedeSubir)
  const hayPlazoAbierto = calendario.some((c) => c.ventana)

  const nombreCompleto =
    [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

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
            <div className="al-saludo">
              {hayPlazoAbierto ? 'Plazo abierto' : 'Sin plazo abierto'}
            </div>
            <h1 className="al-titulo">
              Tus <em>pruebas reales.</em>
            </h1>
          </div>
        </div>

        <p className="eval-intro">
          Grábate haciendo la prueba de verdad y súbela. Tu preparador la ve,
          te corrige la técnica y comprueba que el tramo que tienes asignado es
          el que te toca. No es un examen: es la forma de que lo que pone en la
          plataforma se parezca a lo que haces en el gimnasio.
        </p>

        {categorias.length === 0 ? (
          <div className="al-vacio">
            <div className="al-vacio-icono">🎬</div>
            <h2>Todavía no tienes categorías contratadas</h2>
            <p>
              En cuanto tengas un plan activo, aquí podrás subir tus pruebas.
            </p>
            <Link href="/suscripcion" className="cta-primary">
              Ver mi suscripción
            </Link>
          </div>
        ) : (
          <>
            {/* Qué puedes subir AHORA. Lo decide el plazo que abre tu
                preparador, no tu propio calendario. */}
            <section className="admin-section" style={{ padding: 28, marginBottom: 20 }}>
              <h3 className="ficha-seccion-titulo">
                {puede.length > 0
                  ? `Puedes subir ${puede.length} ${puede.length === 1 ? 'prueba' : 'pruebas'}`
                  : hayPlazoAbierto
                    ? 'Ya has subido lo de este plazo'
                    : 'Todavía no toca'}
              </h3>
              <p className="ficha-accion-desc" style={{ maxWidth: '100%', marginBottom: 18 }}>
                {puede.length > 0
                  ? 'Grábate cuando puedas y súbelo antes de que se cierre el plazo.'
                  : hayPlazoAbierto
                    ? 'Cuando tu preparador las corrija, te avisará.'
                    : 'Tu preparador abre un plazo cada cierto tiempo. Te avisará cuando toque.'}
              </p>

              <div className="eval-calendario">
                {calendario.map((c) => (
                  <div
                    key={c.categoriaId}
                    className={`eval-cat ${c.puedeSubir ? 'toca' : ''}`}
                  >
                    <div className="eval-cat-cab">
                      <span className="eval-cat-nombre">{c.categoria}</span>
                      {c.puedeSubir ? (
                        <span className="eval-cat-estado toca">Abierto</span>
                      ) : c.yaSubida ? (
                        <span className="eval-cat-estado">Ya subida</span>
                      ) : (
                        <span className="eval-cat-estado">Cerrado</span>
                      )}
                    </div>

                    <p className="eval-cat-fechas">
                      {c.ventana
                        ? `${c.ventana.nombre} · hasta el ${fmt(c.ventana.fin)}`
                        : c.proxima
                          ? `Siguiente plazo: ${fmt(c.proxima.inicio)}`
                          : 'Sin plazo programado.'}
                      {c.ultima && ` · Última prueba: ${fmt(c.ultima)}`}
                    </p>

                    {c.puedeSubir ? (
                      <SubirEvaluacion categoriaId={c.categoriaId} categoria={c.categoria} />
                    ) : (
                      <button type="button" className="eval-btn" disabled>
                        {c.yaSubida ? 'Prueba ya enviada' : 'Plazo cerrado'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Lo que ya has subido */}
            <section className="admin-section" style={{ padding: 28 }}>
              <h3 className="ficha-seccion-titulo">Tu historial</h3>
              <p className="ficha-accion-desc" style={{ maxWidth: '100%', marginBottom: 18 }}>
                Tus pruebas anteriores y lo que te dijo tu preparador.
              </p>

              {evaluaciones.length === 0 ? (
                <p className="susc-plan-vacio">Todavía no has subido ninguna prueba.</p>
              ) : (
                <div className="eval-historial">
                  {evaluaciones.map((e) => (
                    <article key={e.id} className="eval-item">
                      <div className="eval-item-cab">
                        <div>
                          <span className="eval-item-cat">{e.categoria}</span>
                          <span className="eval-item-fecha">{fmt(e.fechaExamen)}</span>
                        </div>
                        <span className={`eval-pill ${e.estado}`}>
                          {e.estado === 'revisada' ? 'Corregida' : 'Esperando corrección'}
                        </span>
                      </div>

                      {e.videoId && bunnyConfigurado() && (
                        <div className="video-frame eval-video">
                          <iframe
                            src={urlEmbedFirmada(e.videoId)}
                            loading="lazy"
                            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                            allowFullScreen
                            title={`Prueba de ${e.categoria}`}
                          />
                        </div>
                      )}

                      {e.notasAlumno && (
                        <div className="eval-notas">
                          <span className="eval-notas-label">Lo que contaste</span>
                          <p>{e.notasAlumno}</p>
                        </div>
                      )}

                      {e.estado === 'revisada' && e.feedback ? (
                        <div className="eval-feedback">
                          <span className="eval-feedback-label">Tu preparador</span>
                          <p>{e.feedback}</p>
                        </div>
                      ) : (
                        <div className="eval-pendiente">
                          <p>Tu preparador aún no la ha visto. Te avisará por el chat.</p>
                          <BorrarEvaluacion id={e.id} categoria={e.categoria} />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
