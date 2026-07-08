// CRM: listado de alumnos con buscador y filtros (especialidad, estado).
// La página calcula el estado de acceso de cada uno y delega el render
// y el filtrado al componente cliente (instantáneo, sin recargar).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TablaAlumnos, { type AlumnoFila } from '@/components/TablaAlumnos'

export default async function AdminAlumnosPage() {
  const supabase = await createClient()
  const hoy = new Date().toISOString().slice(0, 10)

  const { data: alumnos, error } = await supabase
    .from('profiles')
    .select(
      'id, nombre, apellidos, email, username, telefono, especialidad, nivel, suscripciones(estado, fecha_fin)'
    )
    .eq('rol', 'alumno')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="form-error">Error cargando alumnos: {error.message}</p>
  }

  // Calculamos el acceso vigente de cada alumno y preparamos filas planas
  const filas: AlumnoFila[] = (alumnos ?? []).map((a) => {
    const vigente = (a.suscripciones ?? [])
      .filter((s) => s.estado === 'activa' && s.fecha_fin >= hoy)
      .sort((x, y) => (x.fecha_fin < y.fecha_fin ? 1 : -1))[0]
    return {
      id: a.id,
      nombre: a.nombre,
      apellidos: a.apellidos,
      email: a.email,
      username: a.username,
      telefono: a.telefono,
      especialidad: a.especialidad,
      nivel: a.nivel,
      fechaFinVigente: vigente?.fecha_fin ?? null,
    }
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

      <TablaAlumnos alumnos={filas} />
    </>
  )
}
