// Lista de ejercicios v2: filtrable por categoría, muestra tramo,
// oposiciones marcadas, vídeo y estado de publicación.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSubNav from '@/components/AdminSubNav'

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

export default async function AdminEjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const { cat } = await searchParams
  const supabase = await createClient()

  let consulta = supabase
    .from('ejercicios')
    .select(
      'id, titulo, slug, publicado, orden, video_id, categoria_id, tramo_id, categorias_ejercicio(nombre), tramos(nombre), ejercicio_oposiciones(especialidad), ejercicio_faqs(count)'
    )
    .order('orden')
    .order('titulo')

  if (cat) consulta = consulta.eq('categoria_id', cat)

  const [{ data: ejercicios, error }, { data: categorias }] = await Promise.all([
    consulta,
    supabase.from('categorias_ejercicio').select('id, nombre').order('orden').order('nombre'),
  ])

  if (error) {
    return <p className="form-error">Error cargando ejercicios: {error.message}</p>
  }

  const lista = ejercicios ?? []

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

      {/* Filtro por categoría */}
      <div className="chips-filtro">
        <Link href="/admin/ejercicios" className={`chip-filtro ${!cat ? 'activo' : ''}`}>
          Todas
        </Link>
        {(categorias ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/admin/ejercicios?cat=${c.id}`}
            className={`chip-filtro ${cat === c.id ? 'activo' : ''}`}
          >
            {c.nombre}
          </Link>
        ))}
      </div>

      <div className="admin-section">
        {lista.length === 0 ? (
          <div className="admin-tabla-vacia">
            {cat
              ? 'No hay ejercicios en esta categoría todavía.'
              : 'Aún no hay ejercicios. Crea el primero.'}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Categoría · Tramo</th>
                <th>Oposiciones</th>
                <th>Vídeo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const nFaqs = e.ejercicio_faqs?.[0]?.count ?? 0
                const catNombre = rel(e.categorias_ejercicio)?.nombre ?? '—'
                const tramoNombre = rel(e.tramos)?.nombre
                const opos = (e.ejercicio_oposiciones ?? []).map(
                  (o: { especialidad: string }) => o.especialidad
                )
                return (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/admin/ejercicios/${e.id}`} className="name name-link">
                        {e.titulo}
                      </Link>
                      <div className="sub">
                        /{e.slug ?? '—'}
                        {nFaqs > 0 && ` · ${nFaqs} pregunta${nFaqs === 1 ? '' : 's'}`}
                      </div>
                    </td>
                    <td>
                      {catNombre}
                      <div className="sub">{tramoNombre ? `Tramo ${tramoNombre}` : 'Todos los tramos'}</div>
                    </td>
                    <td>
                      {opos.length === 0 ? (
                        <span className="tag-opos vacia">Sin marcar</span>
                      ) : (
                        opos.map((o: string) => (
                          <span key={o} className="tag-opos">
                            {ETIQ_CORTA[o] ?? o}
                          </span>
                        ))
                      )}
                    </td>
                    <td>{e.video_id ? '✓' : '—'}</td>
                    <td>
                      {e.publicado ? (
                        <span className="status-pill">
                          <span className="dot"></span> Publicado
                        </span>
                      ) : (
                        <span className="status-pill bad">
                          <span className="dot"></span> Borrador
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
