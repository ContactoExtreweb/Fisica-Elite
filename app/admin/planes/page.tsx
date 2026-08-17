// Lista de planes de venta con sus precios (se editan entrando en cada uno).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSubNav from '@/components/AdminSubNav'

const ETIQ_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
  aduanas: 'Aduanas',
}

const TIPO_TXT: Record<string, string> = {
  ejercicio: 'Por ejercicio',
  completo: 'Completo',
  oposicion: 'Por oposición',
}

export default async function AdminPlanesPage() {
  const supabase = await createClient()
  const { data: planes, error } = await supabase
    .from('planes')
    .select(
      'id, nombre, slug, tipo, precio_centimos, especialidad, activo, orden, plan_categorias(count)'
    )
    .order('orden')
    .order('nombre')

  if (error) {
    return <p className="form-error">Error cargando planes: {error.message}</p>
  }

  const lista = planes ?? []

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">Contenido · {lista.length} planes</div>
          <h1 className="page-title">
            Planes y <em>precios.</em>
          </h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/planes/nuevo" className="admin-topbar-cta">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo plan
          </Link>
        </div>
      </div>

      <AdminSubNav />

      <div className="admin-section">
        {lista.length === 0 ? (
          <div className="admin-tabla-vacia">Aún no hay planes. Crea el primero.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Tipo</th>
                <th>Precio/mes</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/planes/${p.id}`} className="name name-link">
                      {p.nombre}
                    </Link>
                    <div className="sub">/{p.slug}</div>
                  </td>
                  <td>
                    <span className={`plan-tipo ${p.tipo}`}>
                      {TIPO_TXT[p.tipo] ?? p.tipo}
                      {p.tipo === 'oposicion' && p.especialidad
                        ? ` · ${ETIQ_ESP[p.especialidad] ?? p.especialidad}`
                        : ''}
                      {p.tipo === 'ejercicio'
                        ? ` · ${p.plan_categorias?.[0]?.count ?? 0} cat.`
                        : ''}
                    </span>
                  </td>
                  <td className="plan-precio">
                    {(p.precio_centimos / 100).toFixed(2).replace('.', ',')} €
                  </td>
                  <td>
                    {p.activo ? (
                      <span className="status-pill">
                        <span className="dot"></span> A la venta
                      </span>
                    ) : (
                      <span className="status-pill bad">
                        <span className="dot"></span> Oculto
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
