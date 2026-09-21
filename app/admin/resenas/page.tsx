// Lista de reseñas de la web pública (se editan entrando en cada una).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSubNav from '@/components/AdminSubNav'

export default async function AdminResenasPage() {
  const supabase = await createClient()
  const { data: resenas, error } = await supabase
    .from('resenas')
    .select('id, nombre, texto, puntuacion, origen, visible, orden')
    .order('orden')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="form-error">Error cargando reseñas: {error.message}</p>
  }

  const lista = resenas ?? []
  const visibles = lista.filter((r) => r.visible).length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">
            Contenido · {visibles} visibles de {lista.length}
          </div>
          <h1 className="page-title">
            <em>Reseñas.</em>
          </h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/resenas/nueva" className="admin-topbar-cta">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nueva reseña
          </Link>
        </div>
      </div>

      <AdminSubNav />

      <p className="ff-hint" style={{ margin: '0 0 16px' }}>
        Las reseñas visibles salen en el Inicio (las 6 primeras, por orden) y en «Sobre nosotros»
        (todas).
      </p>

      <div className="admin-section">
        {lista.length === 0 ? (
          <div className="admin-tabla-vacia">Aún no hay reseñas. Añade la primera.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reseña</th>
                <th>Nota</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/resenas/${r.id}`} className="name name-link">
                      {r.nombre}
                    </Link>
                    <div className="sub res-admin-texto">{r.texto}</div>
                  </td>
                  <td className="plan-precio">{r.puntuacion}/5</td>
                  <td>
                    {r.visible ? (
                      <span className="status-pill">
                        <span className="dot"></span> Visible
                      </span>
                    ) : (
                      <span className="status-pill bad">
                        <span className="dot"></span> Oculta
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
