// Lista de ejercicios v2, en tarjetas agrupadas por categoría (como las
// ve el propio alumno en /inicio) en vez de una tabla plana: de un
// vistazo se ve qué tiene vídeo, qué está sin publicar y a qué
// oposiciones cuenta cada uno. Filtrable por categoría y por
// explicativos.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSubNav from '@/components/AdminSubNav'
import FiltroEjercicios from '@/components/FiltroEjercicios'

const ETIQ_CORTA: Record<string, string> = {
  policia_local: 'P. Local',
  policia_nacional: 'P. Nacional',
  guardia_civil: 'G. Civil',
  fuerzas_armadas: 'FF.AA.',
  aduanas: 'Aduanas',
}

// PostgREST devuelve las relaciones a-uno como objeto (o array según
// versión); esto normaliza ambos casos.
function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

type Ejercicio = {
  id: string
  titulo: string
  slug: string | null
  publicado: boolean
  explicativo: boolean
  video_id: string | null
  categoria_id: string
  categorias_ejercicio: { nombre: string; orden: number } | { nombre: string; orden: number }[] | null
  tramos: { nombre: string } | { nombre: string }[] | null
  ejercicio_oposiciones: { especialidad: string }[] | null
  ejercicio_faqs: { count: number }[] | null
}

export default async function AdminEjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; tipo?: string }>
}) {
  const { cat, tipo } = await searchParams
  const soloExpl = tipo === 'explicativos'
  const supabase = await createClient()

  let consulta = supabase
    .from('ejercicios')
    .select(
      'id, titulo, slug, publicado, explicativo, orden, video_id, categoria_id, tramo_id, categorias_ejercicio(nombre, orden), tramos(nombre), ejercicio_oposiciones(especialidad), ejercicio_faqs(count)'
    )
    .order('orden')
    .order('titulo')

  if (cat) consulta = consulta.eq('categoria_id', cat)
  if (soloExpl) consulta = consulta.eq('explicativo', true)

  const [{ data: ejercicios, error }, { data: categorias }] = await Promise.all([
    consulta,
    supabase.from('categorias_ejercicio').select('id, nombre').order('orden').order('nombre'),
  ])

  if (error) {
    return <p className="form-error">Error cargando ejercicios: {error.message}</p>
  }

  const lista = (ejercicios ?? []) as Ejercicio[]

  // Agrupados por categoría, en SU orden — salvo que ya se haya filtrado
  // a una sola categoría, que entonces sobra el agrupado.
  const grupos = new Map<string, { nombre: string; orden: number; items: Ejercicio[] }>()
  for (const e of lista) {
    const c = rel(e.categorias_ejercicio)
    if (!grupos.has(e.categoria_id)) {
      grupos.set(e.categoria_id, { nombre: c?.nombre ?? 'Sin categoría', orden: c?.orden ?? 999, items: [] })
    }
    grupos.get(e.categoria_id)!.items.push(e)
  }
  const seccionesAgrupadas = cat ? null : [...grupos.values()].sort((a, b) => a.orden - b.orden)

  const tarjeta = (e: Ejercicio) => {
    const nFaqs = e.ejercicio_faqs?.[0]?.count ?? 0
    const tramoNombre = rel(e.tramos)?.nombre
    const opos = (e.ejercicio_oposiciones ?? []).map((o) => o.especialidad)
    return (
      <Link key={e.id} href={`/admin/ejercicios/${e.id}`} className="ej-card">
        <div className="ej-card-top">
          {e.publicado ? (
            <span className="status-pill">
              <span className="dot" /> Publicado
            </span>
          ) : (
            <span className="status-pill bad">
              <span className="dot" /> Borrador
            </span>
          )}
          {e.explicativo && <span className="ej-tag-expl">Explicativo</span>}
        </div>

        <div className="ej-card-media">
          {e.video_id ? (
            <span className="ej-card-play">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          ) : (
            <span className="ej-card-sinvideo">Sin vídeo</span>
          )}
        </div>

        <div className="ej-card-body">
          <h3>{e.titulo}</h3>
          <div className="ej-card-meta">
            {e.explicativo ? 'Todos los tramos' : tramoNombre ? `Tramo ${tramoNombre}` : 'Todos los tramos'}
            {nFaqs > 0 && ` · ${nFaqs} pregunta${nFaqs === 1 ? '' : 's'}`}
          </div>
          <div className="ej-card-opos">
            {opos.length === 0 ? (
              <span className="tag-opos vacia">Sin oposición marcada</span>
            ) : (
              opos.map((o) => (
                <span key={o} className="tag-opos">
                  {ETIQ_CORTA[o] ?? o}
                </span>
              ))
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">Contenido · {lista.length} ejercicios</div>
          <h1 className="page-title">
            Tus <em>ejercicios.</em>
          </h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/ejercicios/nuevo" className="admin-topbar-cta">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo ejercicio
          </Link>
        </div>
      </div>

      <AdminSubNav />

      <FiltroEjercicios categorias={categorias ?? []} catActual={cat} soloExplActual={soloExpl} />

      {lista.length === 0 ? (
        <div className="admin-section">
          <div className="admin-tabla-vacia">
            {soloExpl
              ? 'No hay ejercicios explicativos todavía. Se marcan con el interruptor «Ejercicio explicativo» de la ficha.'
              : cat
                ? 'No hay ejercicios en esta categoría todavía.'
                : 'Aún no hay ejercicios. Crea el primero.'}
          </div>
        </div>
      ) : seccionesAgrupadas ? (
        seccionesAgrupadas.map((g) => (
          <section key={g.nombre} className="al-cat">
            <div className="al-cat-cab">
              <h2>{g.nombre}</h2>
              <span className="al-cat-num">
                {g.items.length} {g.items.length === 1 ? 'ejercicio' : 'ejercicios'}
              </span>
            </div>
            <div className="ej-grid">{g.items.map(tarjeta)}</div>
          </section>
        ))
      ) : (
        <div className="ej-grid">{lista.map(tarjeta)}</div>
      )}
    </>
  )
}
