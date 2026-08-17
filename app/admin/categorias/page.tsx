// Gestión de categorías de ejercicio (y acceso a sus tramos).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSubNav from '@/components/AdminSubNav'

const METRICA_TXT: Record<string, string> = {
  repeticiones: 'Repeticiones',
  tiempo: 'Tiempo',
  distancia: 'Distancia',
  peso: 'Peso',
}

export default async function AdminCategoriasPage() {
  const supabase = await createClient()
  const { data: categorias, error } = await supabase
    .from('categorias_ejercicio')
    .select('id, nombre, slug, metrica, unidad, orden, activa, tramos(count), ejercicios(count)')
    .order('orden')
    .order('nombre')

  if (error) {
    return <p className="form-error">Error cargando categorías: {error.message}</p>
  }

  const lista = (categorias ?? []).map((c) => ({
    ...c,
    nTramos: c.tramos?.[0]?.count ?? 0,
    nEjercicios: c.ejercicios?.[0]?.count ?? 0,
  }))

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">Contenido · {lista.length} categorías</div>
          <h1 className="page-title">
            Categorías y <em>tramos.</em>
          </h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/categorias/nueva" className="admin-topbar-cta">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nueva categoría
          </Link>
        </div>
      </div>

      <AdminSubNav />

      <div className="admin-section">
        {lista.length === 0 ? (
          <div className="admin-tabla-vacia">
            Aún no hay categorías. Crea la primera (p. ej. «Dominadas»).
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Métrica</th>
                <th>Tramos</th>
                <th>Ejercicios</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/categorias/${c.id}`} className="name name-link">
                      {c.nombre}
                    </Link>
                    <div className="sub">/{c.slug}</div>
                  </td>
                  <td>
                    {METRICA_TXT[c.metrica] ?? c.metrica}{' '}
                    <span className="sub">({c.unidad})</span>
                  </td>
                  <td>{c.nTramos}</td>
                  <td>{c.nEjercicios}</td>
                  <td>
                    {c.activa ? (
                      <span className="status-pill">
                        <span className="dot"></span> Activa
                      </span>
                    ) : (
                      <span className="status-pill bad">
                        <span className="dot"></span> Inactiva
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
