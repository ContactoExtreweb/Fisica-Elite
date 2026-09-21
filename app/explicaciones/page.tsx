// Explicaciones — vídeos de técnica de un movimiento (press banca,
// sentadilla…), separados del entrenamiento por tramos.
//
// Igual que en /inicio, aquí NO se filtra por plan: la RLS de
// `ejercicios` ya devuelve solo lo que este alumno tiene contratado. El
// explicativo de Dominadas lo ve quien tiene Dominadas; el del plan
// completo los ve todos y elige categoría con las pestañas.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { contarNoLeidos } from '@/lib/no-leidos'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import { hoyMadrid } from '@/lib/fechas'

export const metadata = { title: 'Explicaciones' }

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

type Grupo = { id: string; nombre: string; orden: number; ejercicios: Fila[] }

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

export default async function ExplicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const { cat } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = hoyMadrid()

  const [{ data: perfil }, { data: ejercicios }, { data: subs }, noLeidos] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos, presencial').eq('id', user.id).single(),
    supabase
      .from('ejercicios')
      .select(
        'id, slug, titulo, descripcion, video_id, orden, categoria_id, categorias_ejercicio(nombre, orden)'
      )
      .eq('publicado', true)
      .eq('explicativo', true)
      .order('orden')
      .order('titulo'),
    supabase
      .from('suscripciones')
      .select('id')
      .eq('user_id', user.id)
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy)
      .limit(1),
    contarNoLeidos(),
  ])

  const tieneAcceso = (subs ?? []).length > 0
  const lista = (ejercicios ?? []) as Fila[]

  // Agrupar por categoría, en el orden de la categoría
  const grupos = new Map<string, Grupo>()
  for (const e of lista) {
    const c = rel(e.categorias_ejercicio)
    if (!grupos.has(e.categoria_id)) {
      grupos.set(e.categoria_id, {
        id: e.categoria_id,
        nombre: c?.nombre ?? 'Ejercicios',
        orden: c?.orden ?? 999,
        ejercicios: [],
      })
    }
    grupos.get(e.categoria_id)!.ejercicios.push(e)
  }
  const categorias = [...grupos.values()].sort((a, b) => a.orden - b.orden)

  // Si piden una categoría sin explicaciones (o que este alumno no tiene
  // contratada), se ignora el filtro y se enseñan todas.
  const catActiva = cat && grupos.has(cat) ? cat : undefined
  const visibles = catActiva ? categorias.filter((g) => g.id === catActiva) : categorias

  const nombreCompleto = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
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
            <div className="al-saludo">Explicaciones</div>
            <h1 className="al-titulo">
              Técnica, <em>paso a paso.</em>
            </h1>
          </div>
        </div>

        {!tieneAcceso ? (
          <div className="al-vacio">
            <div className="al-vacio-icono">🔒</div>
            <h2>Tu acceso no está activo</h2>
            <p>
              En cuanto tu preparador active tu suscripción, aquí verás las explicaciones de lo
              que tengas contratado.
            </p>
            <Link href="/chat" className="cta-primary">
              Hablar con mi preparador
            </Link>
          </div>
        ) : categorias.length === 0 ? (
          <div className="al-vacio">
            <div className="al-vacio-icono">🎬</div>
            <h2>Aún no hay explicaciones</h2>
            <p>
              Tu preparador irá subiendo vídeos con la técnica de cada movimiento. En cuanto
              publique alguno de tus categorías, aparecerá aquí.
            </p>
            <Link href="/ejercicios" className="cta-primary">
              Ir a mis ejercicios
            </Link>
          </div>
        ) : (
          <>
            {/* Pestañas por categoría (solo si hay más de una) */}
            {categorias.length > 1 && (
              <div className="chips-filtro expl-chips">
                <Link href="/explicaciones" className={`chip-filtro ${!catActiva ? 'activo' : ''}`}>
                  Todas
                </Link>
                {categorias.map((g) => (
                  <Link
                    key={g.id}
                    href={`/explicaciones?cat=${g.id}`}
                    className={`chip-filtro ${catActiva === g.id ? 'activo' : ''}`}
                  >
                    {g.nombre}
                    <span className="chip-filtro-n">{g.ejercicios.length}</span>
                  </Link>
                ))}
              </div>
            )}

            {visibles.map((g) => (
              <section key={g.id} className="al-cat">
                <div className="al-cat-cab">
                  <h2>{g.nombre}</h2>
                  <span className="al-cat-num">
                    {g.ejercicios.length}{' '}
                    {g.ejercicios.length === 1 ? 'explicación' : 'explicaciones'}
                  </span>
                </div>
                <div className="al-grid">
                  {g.ejercicios.map((e) => (
                    <Link key={e.id} href={`/ejercicio/${e.slug ?? e.id}`} className="al-card">
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
            ))}
          </>
        )}
      </main>
    </div>
  )
}
