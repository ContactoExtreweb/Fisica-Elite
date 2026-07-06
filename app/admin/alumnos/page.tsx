// CRM: listado de alumnos con su estado de suscripción real.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

function iniciales(nombre?: string | null, apellidos?: string | null) {
  const n = (nombre ?? '').trim().charAt(0)
  const a = (apellidos ?? '').trim().charAt(0)
  return (n + a).toUpperCase() || '??'
}

function formatoFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default async function AdminAlumnosPage() {
  const supabase = await createClient()
  const hoy = new Date().toISOString().slice(0, 10)

  const { data: alumnos, error } = await supabase
    .from('profiles')
    .select(
      'id, nombre, apellidos, email, username, especialidad, nivel, suscripciones(estado, fecha_fin)'
    )
    .eq('rol', 'alumno')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="form-error">Error cargando alumnos: {error.message}</p>
  }

  const filas = (alumnos ?? []).map((a) => {
    // Acceso vigente: alguna suscripción activa cuya fecha_fin llegue a hoy
    const vigente = (a.suscripciones ?? [])
      .filter((s) => s.estado === 'activa' && s.fecha_fin >= hoy)
      .sort((x, y) => (x.fecha_fin < y.fecha_fin ? 1 : -1))[0]
    return { ...a, vigente }
  })

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">CRM · {filas.length} alumnos</div>
          <h1 className="page-title">
            Tus <em>alumnos.</em>
          </h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/alumnos/nuevo" className="admin-topbar-cta">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Añadir alumno
          </Link>
        </div>
      </div>

      <div className="admin-section">
        {filas.length === 0 ? (
          <div className="admin-tabla-vacia">
            Aún no hay alumnos. Crea el primero con «Añadir alumno».
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Especialidad</th>
                <th>Nivel</th>
                <th>Suscripción</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="alumno-cell">
                      <div className="avatar-small">
                        {iniciales(a.nombre, a.apellidos)}
                      </div>
                      <div>
                        <Link href={`/admin/alumnos/${a.id}`} className="name name-link">
                          {[a.nombre, a.apellidos].filter(Boolean).join(' ') ||
                            a.username ||
                            'Sin nombre'}
                        </Link>
                        <div className="sub">{a.email ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {a.especialidad ? (
                      <span className="plan-tag oposicion">
                        {NOMBRE_ESPECIALIDAD[a.especialidad] ?? a.especialidad}
                      </span>
                    ) : (
                      <span className="plan-tag">Sin asignar</span>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{a.nivel}</td>
                  <td>
                    {a.vigente ? (
                      <span className="status-pill">
                        <span className="dot"></span> Al día · hasta{' '}
                        {formatoFecha(a.vigente.fecha_fin)}
                      </span>
                    ) : (
                      <span className="status-pill bad">
                        <span className="dot"></span> Sin acceso
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
