// Ficha de ejercicio del ALUMNO — con vídeo protegido.
//
// SEGURIDAD (clave): pedimos el ejercicio con el cliente normal, así que
// la RLS decide si este alumno puede verlo (plan contratado + tramo +
// suscripción activa). La URL de vídeo FIRMADA solo se genera si la RLS
// devolvió la fila. Un alumno sin acceso recibe notFound() y jamás se
// llega a firmar ningún token: no hay forma de sacar el vídeo.
import Link from 'next/link'
import NavAlumno from '@/components/NavAlumno'
import BotonLogout from '@/components/BotonLogout'
import { contarNoLeidos } from '@/lib/no-leidos'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bunnyConfigurado, urlEmbedFirmada } from '@/lib/bunny'
import TabsEjercicio from '@/components/TabsEjercicio'
import BotonCompletar from '@/components/BotonCompletar'

// PostgREST devuelve las relaciones a-uno como objeto o como array según
// la versión; esto normaliza ambos casos.
function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

export default async function FichaEjercicioAlumno({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // La RLS filtra: si el alumno no tiene acceso a este ejercicio,
  // simplemente no existe para él → notFound().
  // Traemos también su categoría (para el registro de marca) y su tramo.
  const { data: ejercicio } = await supabase
    .from('ejercicios')
    .select('*, categorias_ejercicio(id, nombre, metrica, unidad), tramos(nombre)')
    .eq('slug', slug)
    .single()

  if (!ejercicio) notFound()

  const id = ejercicio.id // el resto del código usa el id real de la fila
  const categoria = rel(ejercicio.categorias_ejercicio) as
    | { id: string; nombre: string; metrica: string; unidad: string }
    | undefined
  const tramo = rel(ejercicio.tramos) as { nombre: string } | undefined

  // ¿Lo tiene marcado como completado?
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Datos para el sidebar completo (mismo shell que el resto del área)
  const [{ data: perfilSidebar }, noLeidos] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos').eq('id', user!.id).single(),
    contarNoLeidos(),
  ])
  const inicialesSidebar =
    ((perfilSidebar?.nombre ?? '').charAt(0) + (perfilSidebar?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

  const { data: prog } = await supabase
    .from('progreso')
    .select('id')
    .eq('user_id', user!.id)
    .eq('ejercicio_id', id)
    .maybeSingle()
  const completado = !!prog

  // Ejercicios hermanos: los de la MISMA CATEGORÍA, en orden, para navegar
  // anterior/siguiente. La RLS ya se encarga de devolver solo los del
  // tramo del alumno (o todos, si se le desbloquearon).
  const { data: hermanos } = await supabase
    .from('ejercicios')
    .select('id, titulo, slug')
    .eq('categoria_id', ejercicio.categoria_id)
    .eq('publicado', true)
    .order('orden')
    .order('titulo')

  const listaHermanos = hermanos ?? []
  const idx = listaHermanos.findIndex((h) => h.id === id)
  const anterior = idx > 0 ? listaHermanos[idx - 1] : null
  const siguiente = idx >= 0 && idx < listaHermanos.length - 1 ? listaHermanos[idx + 1] : null

  const { data: faqs } = await supabase
    .from('ejercicio_faqs')
    .select('id, pregunta, respuesta')
    .eq('ejercicio_id', id)
    .order('orden')
    .order('created_at')

  // La firma del embed se genera AQUÍ, en servidor, y solo porque la RLS
  // ya autorizó el acceso a la fila de arriba.
  const embedUrl =
    bunnyConfigurado() && ejercicio.video_id
      ? urlEmbedFirmada(ejercicio.video_id)
      : null

  const tabs = [
    { clave: 'tecnica', etiqueta: 'Técnica', contenido: ejercicio.tecnica },
    { clave: 'errores', etiqueta: 'Errores comunes', contenido: ejercicio.errores_comunes },
    { clave: 'variantes', etiqueta: 'Variantes', contenido: ejercicio.variantes },
    { clave: 'mejoras', etiqueta: 'Mejoras', contenido: ejercicio.mejoras },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICAS<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>

        <NavAlumno noLeidos={noLeidos} />

        <div className="sidebar-foot">
          <div className="avatar">{inicialesSidebar}</div>
          <div>
            <div className="who">
              {[perfilSidebar?.nombre, perfilSidebar?.apellidos].filter(Boolean).join(' ') || 'Alumno'}
            </div>
            <BotonLogout variante="texto" />
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar-movil">
          <div className="topbar-movil-marca">FÍSICAS<span className="accent">.</span>ELITE</div>
          <BotonLogout variante="icono" />
        </div>

        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
          <Link href="/inicio" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
            ← Volver a mis ejercicios
          </Link>
        </div>

        <div className="exercise-detail">
          {/* Columna principal */}
          <div>
            <div className="video-frame">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  loading="lazy"
                  allow="accelerometer; gyroscope; encrypted-media"
                  allowFullScreen
                  title={ejercicio.titulo}
                />
              ) : (
                <div className="video-sin">
                  El vídeo de este ejercicio estará disponible en breve.
                </div>
              )}
            </div>

            <h1 className="exercise-title">{ejercicio.titulo}</h1>
            {ejercicio.descripcion && (
              <p className="exercise-subtitle">{ejercicio.descripcion}</p>
            )}

            <div className="exercise-tags">
              {categoria?.nombre && (
                <span className="plan-tag oposicion">{categoria.nombre}</span>
              )}
              <span className="tag">
                {tramo?.nombre ? `Tramo ${tramo.nombre}` : 'Todos los tramos'}
              </span>
            </div>

            {/* Completar + registro de la marca (se despliega al completar) */}
            <BotonCompletar
              ejercicioId={id}
              completadoInicial={completado}
              categoria={categoria ?? null}
            />

            <TabsEjercicio tabs={tabs} />

            {/* Navegación entre ejercicios de la misma categoría */}
            {(anterior || siguiente) && (
              <div className="leccion-nav">
                {anterior ? (
                  <Link href={`/ejercicio/${anterior.slug}`} className="leccion-nav-btn prev">
                    <span className="leccion-nav-flecha">←</span>
                    <span className="leccion-nav-txt">
                      <span className="leccion-nav-label">Anterior</span>
                      <span className="leccion-nav-titulo">{anterior.titulo}</span>
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {siguiente ? (
                  <Link href={`/ejercicio/${siguiente.slug}`} className="leccion-nav-btn next">
                    <span className="leccion-nav-txt">
                      <span className="leccion-nav-label">Siguiente</span>
                      <span className="leccion-nav-titulo">{siguiente.titulo}</span>
                    </span>
                    <span className="leccion-nav-flecha">→</span>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}
          </div>

          {/* Columna lateral: FAQ */}
          <aside>
            <div className="aside-card">
              <h4>Preguntas frecuentes</h4>
              {(faqs ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                  No hay preguntas frecuentes para este ejercicio todavía.
                </p>
              ) : (
                <div className="faq-alumno">
                  {faqs!.map((f) => (
                    <details key={f.id}>
                      <summary>{f.pregunta}</summary>
                      <div className="respuesta">{f.respuesta}</div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
