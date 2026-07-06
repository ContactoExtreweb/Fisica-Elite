// Biblioteca de ejercicios del panel, con DOBLE filtro combinable:
// especialidad + nivel (los chips preservan el otro filtro activo).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

const NIVELES = ['iniciado', 'avanzado', 'profesional'] as const

function href(esp?: string, niv?: string) {
  const p = new URLSearchParams()
  if (esp) p.set('esp', esp)
  if (niv) p.set('niv', niv)
  const qs = p.toString()
  return qs ? `/admin/ejercicios?${qs}` : '/admin/ejercicios'
}

function formatoDuracion(seg: number | null) {
  if (!seg) return null
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default async function AdminEjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ esp?: string; niv?: string }>
}) {
  const { esp, niv } = await searchParams
  const supabase = await createClient()

  const { data: ejercicios, error } = await supabase
    .from('ejercicios')
    .select(
      'id, titulo, especialidad, nivel, publicado, orden, video_id, video_duracion, ejercicio_faqs(count)'
    )
    .order('especialidad')
    .order('orden')
    .order('titulo')

  if (error) {
    return <p className="form-error">Error cargando ejercicios: {error.message}</p>
  }

  const todos = ejercicios ?? []
  const visibles = todos.filter(
    (e) => (!esp || e.especialidad === esp) && (!niv || e.nivel === niv)
  )

  // Contadores: especialidad cuenta dentro del nivel activo, y viceversa
  const porEspecialidad = Object.keys(NOMBRE_ESPECIALIDAD).map((clave) => ({
    clave,
    nombre: NOMBRE_ESPECIALIDAD[clave],
    n: todos.filter((e) => e.especialidad === clave && (!niv || e.nivel === niv)).length,
  }))

  const porNivel = NIVELES.map((clave) => ({
    clave,
    n: todos.filter((e) => e.nivel === clave && (!esp || e.especialidad === esp)).length,
  }))

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">Biblioteca · {todos.length} ejercicios</div>
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

      {/* Filtro por especialidad */}
      <div className="filters" style={{ marginBottom: 12 }}>
        <Link href={href(undefined, niv)} className={`chip ${!esp ? 'active' : ''}`}>
          Todas · {todos.filter((e) => !niv || e.nivel === niv).length}
        </Link>
        {porEspecialidad.map((c) => (
          <Link
            key={c.clave}
            href={href(c.clave, niv)}
            className={`chip ${esp === c.clave ? 'active' : ''}`}
          >
            {c.nombre} · {c.n}
          </Link>
        ))}
      </div>

      {/* Filtro por nivel */}
      <div className="filters">
        <Link href={href(esp, undefined)} className={`chip ${!niv ? 'active' : ''}`}>
          Todos los niveles
        </Link>
        {porNivel.map((c) => (
          <Link
            key={c.clave}
            href={href(esp, c.clave)}
            className={`chip ${niv === c.clave ? 'active' : ''}`}
            style={{ textTransform: 'capitalize' }}
          >
            {c.clave} · {c.n}
          </Link>
        ))}
      </div>

      <div className="admin-section">
        {visibles.length === 0 ? (
          <div className="admin-tabla-vacia">
            {esp || niv
              ? 'No hay ejercicios con estos filtros.'
              : 'Aún no hay ejercicios. Crea el primero con «Nuevo ejercicio».'}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Especialidad</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => {
                const nFaqs = e.ejercicio_faqs?.[0]?.count ?? 0
                const dur = formatoDuracion(e.video_duracion)
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="alumno-cell">
                        <div>
                          <div className="name">{e.titulo}</div>
                          <div className="sub">
                            {e.video_id ? (dur ? `Vídeo · ${dur}` : 'Vídeo subido') : 'Sin vídeo'}
                            {' · '}
                            {nFaqs} FAQ{nFaqs === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="plan-tag oposicion">
                        {NOMBRE_ESPECIALIDAD[e.especialidad] ?? e.especialidad}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${e.nivel}`}>{e.nivel}</span>
                    </td>
                    <td>
                      {e.publicado ? (
                        <span className="status-pill">
                          <span className="dot"></span> Publicado
                        </span>
                      ) : (
                        <span className="status-pill warn">
                          <span className="dot"></span> Borrador
                        </span>
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/ejercicios/${e.id}`} className="admin-row-action">
                        Editar →
                      </Link>
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
