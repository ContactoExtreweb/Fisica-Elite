// Área del alumno (v2). Sus ejercicios agrupados por categoría.
//
// No filtramos aquí por plan ni por tramo: la RLS de `ejercicios` ya
// devuelve ÚNICAMENTE lo que este alumno puede ver (plan contratado +
// su tramo, o todos los tramos si se le desbloquearon).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'

export const metadata = { title: 'Mis ejercicios' }

type Fila = {
  id: string
  slug: string | null
  titulo: string
  descripcion: string | null
  video_id: string | null
  orden: number
  categoria_id: string
  categorias_ejercicio: { nombre: string; orden: number } | { nombre: string; orden: number }[] | null
}

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

export default async function InicioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date().toISOString().slice(0, 10)

  const [{ data: perfil }, { data: ejercicios }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos').eq('id', user.id).single(),
    supabase
      .from('ejercicios')
      .select(
        'id, slug, titulo, descripcion, video_id, orden, categoria_id, categorias_ejercicio(nombre, orden)'
      )
      .eq('publicado', true)
      .order('orden'),
    supabase
      .from('suscripciones')
      .select('id')
      .eq('user_id', user.id)
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy)
      .limit(1),
  ])

  const tieneAcceso = (subs ?? []).length > 0
  const lista = (ejercicios ?? []) as Fila[]

  // Agrupar por categoría, respetando su orden
  const grupos = new Map<string, { nombre: string; orden: number; ejercicios: Fila[] }>()
  for (const e of lista) {
    const c = rel(e.categorias_ejercicio)
    if (!grupos.has(e.categoria_id)) {
      grupos.set(e.categoria_id, {
        nombre: c?.nombre ?? 'Ejercicios',
        orden: c?.orden ?? 999,
        ejercicios: [],
      })
    }
    grupos.get(e.categoria_id)!.ejercicios.push(e)
  }
  const categorias = [...grupos.values()].sort((a, b) => a.orden - b.orden)

  const nombreCorto = (perfil?.nombre ?? '').trim().split(' ')[0]
  const nombreCompleto =
    [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICA<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>
        <NavAlumno />
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
            FÍSICA<span className="accent">.</span>ELITE
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
              En cuanto tu preparador active tu suscripción, aquí verás todos los ejercicios de lo
              que tengas contratado.
            </p>
            <Link href="/chat" className="cta-primary">
              Hablar con mi preparador
            </Link>
          </div>
        ) : categorias.length === 0 ? (
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
          categorias.map((cat) => (
            <section key={cat.nombre} className="al-cat">
              <div className="al-cat-cab">
                <h2>{cat.nombre}</h2>
                <span className="al-cat-num">
                  {cat.ejercicios.length} {cat.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}
                </span>
              </div>
              <div className="al-grid">
                {cat.ejercicios.map((e) => (
                  <Link
                    key={e.id}
                    href={`/ejercicio/${e.slug ?? e.id}`}
                    className="al-card"
                  >
                    <div className="al-card-media">
                      {e.video_id ? (
                        <span className="al-card-play">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      ) : (
                        <span className="al-card-sinvideo">Sin vídeo</span>
                      )}
                    </div>
                    <div className="al-card-cuerpo">
                      <h3>{e.titulo}</h3>
                      {e.descripcion && <p>{e.descripcion}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
