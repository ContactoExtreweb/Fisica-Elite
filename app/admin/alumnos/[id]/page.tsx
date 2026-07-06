// Ficha de un alumno para el admin: ver estado, editar datos,
// regenerar contraseña, dar de baja y eliminar.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AlumnoEditor from '@/components/AlumnoEditor'
import AlumnoAcciones from '@/components/AlumnoAcciones'
import AlumnoSuscripcion from '@/components/AlumnoSuscripcion'

const NOMBRE_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function FichaAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: alumno } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, email, telefono, edad, especialidad, nivel, rol, username, created_at')
    .eq('id', id)
    .single()

  if (!alumno) notFound()

  // Suscripción más reciente para mostrar estado
  const { data: sub } = await supabase
    .from('suscripciones')
    .select('estado, fecha_fin, metodo, meses')
    .eq('user_id', id)
    .order('fecha_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  const hoy = new Date().toISOString().slice(0, 10)
  const accesoActivo = !!sub && sub.estado === 'activa' && (sub.fecha_fin ?? '') >= hoy

  const nombre = [alumno.nombre, alumno.apellidos].filter(Boolean).join(' ') || 'Sin nombre'
  const esAdmin = alumno.rol === 'admin'

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
        <Link href="/admin/alumnos" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a alumnos
        </Link>
      </div>

      <div className="topbar" style={{ marginBottom: 24 }}>
        <div>
          <div className="greeting">{alumno.email}</div>
          <h1 className="page-title">{nombre}</h1>
        </div>
      </div>

      {/* Resumen de estado */}
      <div className="ficha-resumen">
        <div className="ficha-chip">
          <span className="ficha-chip-label">Oposición</span>
          <span className="plan-tag oposicion">
            {alumno.especialidad ? NOMBRE_ESP[alumno.especialidad] : 'Sin asignar'}
          </span>
        </div>
        <div className="ficha-chip">
          <span className="ficha-chip-label">Nivel</span>
          <span className={`tag ${alumno.nivel}`}>{alumno.nivel}</span>
        </div>
        <div className="ficha-chip">
          <span className="ficha-chip-label">Acceso</span>
          {accesoActivo ? (
            <span className="susc-pill activa">● Al día · hasta {fmtFecha(sub!.fecha_fin)}</span>
          ) : (
            <span className="susc-pill inactiva">● Sin acceso</span>
          )}
        </div>
      </div>

      {esAdmin ? (
        <div className="admin-section">
          <div className="admin-tabla-vacia">
            Esta cuenta es de administrador. La edición de datos y las acciones de
            baja/eliminación están pensadas para alumnos.
          </div>
        </div>
      ) : (
        <>
          <div className="ficha-columnas">
            <AlumnoEditor alumno={alumno} />
            <AlumnoAcciones alumnoId={alumno.id} nombre={nombre} tieneAccesoActivo={accesoActivo} />
          </div>
          <div style={{ marginTop: 24 }}>
            <AlumnoSuscripcion
              alumnoId={alumno.id}
              accesoActivo={accesoActivo}
              fechaFin={sub?.fecha_fin ?? null}
            />
          </div>
        </>
      )}
    </>
  )
}
