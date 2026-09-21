// CRM: listado de alumnos con buscador y filtros (especialidad, estado).
// v2: fuera la columna 'nivel' (el modelo nuevo usa tramos por categoría,
// que se gestionan con la autoevaluación del alumno).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TablaAlumnos, { type AlumnoFila } from '@/components/TablaAlumnos'
import PanelRecordatorios from '@/components/PanelRecordatorios'
import { DIAS_INACTIVIDAD, diasDesde, pendienteDeAviso } from '@/lib/actividad'
import { emailConfigurado, emailModoPruebas } from '@/lib/email'
import { hoyMadrid } from '@/lib/fechas'

// El botón "Enviar ahora" corre aquí: con la pausa entre correos puede
// tardar unos segundos más que una acción normal.
export const maxDuration = 60

export default async function AdminAlumnosPage() {
  const supabase = await createClient()
  const hoy = hoyMadrid()

  const { data: alumnos, error } = await supabase
    .from('profiles')
    .select(
      'id, nombre, apellidos, email, username, telefono, especialidad, ultima_actividad, aviso_inactividad_at, recordatorios_email, suscripciones(estado, fecha_fin)'
    )
    .eq('rol', 'alumno')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="form-error">Error cargando alumnos: {error.message}</p>
  }

  // Calculamos el acceso vigente de cada alumno y preparamos filas planas
  let pendientesAviso = 0
  const filas: AlumnoFila[] = (alumnos ?? []).map((a) => {
    const vigente = (a.suscripciones ?? [])
      .filter((s) => s.estado === 'activa' && s.fecha_fin >= hoy)
      .sort((x, y) => (x.fecha_fin < y.fecha_fin ? 1 : -1))[0]
    const dias = diasDesde(a.ultima_actividad)
    if (
      pendienteDeAviso({
        email: a.email,
        recordatorios_email: a.recordatorios_email,
        ultima_actividad: a.ultima_actividad,
        aviso_inactividad_at: a.aviso_inactividad_at,
        tieneAccesoOnline: !!vigente,
      })
    ) {
      pendientesAviso++
    }
    return {
      id: a.id,
      nombre: a.nombre,
      apellidos: a.apellidos,
      email: a.email,
      username: a.username,
      telefono: a.telefono,
      especialidad: a.especialidad,
      fechaFinVigente: vigente?.fecha_fin ?? null,
      diasSinEntrar: dias,
      // Inactivo solo tiene sentido si paga contenido online
      inactivo: !!vigente && dias !== null && dias >= DIAS_INACTIVIDAD,
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

      <PanelRecordatorios
        pendientes={pendientesAviso}
        configurado={emailConfigurado()}
        modoPruebas={emailModoPruebas()}
        dias={DIAS_INACTIVIDAD}
      />

      <TablaAlumnos alumnos={filas} />
    </>
  )
}
