// Ficha de un alumno para el admin: ver estado, editar datos,
// regenerar contraseña, dar de baja y eliminar.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistorialMarcas from '@/components/HistorialMarcas'
import type { RegistroFila } from '@/lib/marcas'
import AlumnoEditor from '@/components/AlumnoEditor'
import AlumnoAcciones from '@/components/AlumnoAcciones'
import GestorSuscripciones, {
  type SuscripcionFila,
  type PlanOpcion,
} from '@/components/GestorSuscripciones'

const NOMBRE_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
  aduanas: 'Aduanas',
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
    .select('id, nombre, apellidos, email, telefono, edad, especialidad, rol, username, created_at')
    .eq('id', id)
    .single()

  if (!alumno) notFound()

  // TODAS sus suscripciones (una por plan contratado) + los planes a la venta
  const [{ data: subsRaw }, { data: planesRaw }] = await Promise.all([
    supabase
      .from('suscripciones')
      .select('id, plan_id, estado, metodo, meses, fecha_inicio, fecha_fin, planes(nombre)')
      .eq('user_id', id)
      .order('fecha_fin', { ascending: false }),
    supabase
      .from('planes')
      .select('id, nombre, tipo, precio_centimos')
      .eq('activo', true)
      .order('orden')
      .order('nombre'),
  ])

  const hoy = new Date().toISOString().slice(0, 10)

  const suscripciones: SuscripcionFila[] = (subsRaw ?? []).map((s) => {
    const plan = Array.isArray(s.planes) ? s.planes[0] : s.planes
    return {
      id: s.id,
      plan_id: s.plan_id,
      plan_nombre: plan?.nombre ?? null,
      estado: s.estado,
      metodo: s.metodo,
      meses: s.meses,
      fecha_inicio: s.fecha_inicio,
      fecha_fin: s.fecha_fin,
    }
  })

  // El acceso vigente es el de la suscripción activa que dura más
  const vigentes = suscripciones
    .filter((s) => s.estado === 'activa' && s.fecha_fin >= hoy)
    .sort((a, b) => (a.fecha_fin < b.fecha_fin ? 1 : -1))
  const accesoActivo = vigentes.length > 0
  const finAcceso = vigentes[0]?.fecha_fin ?? null

  // Marcas que ha ido apuntando el alumno (las lee el admin por RLS)
  const [{ data: registros }, { data: cats }] = await Promise.all([
    supabase
      .from('registros_entrenamiento')
      .select('id, fecha, repeticiones, peso_kg, distancia_km, tiempo_seg, series, notas, categoria_id')
      .eq('user_id', id)
      .order('fecha', { ascending: false })
      .limit(40),
    supabase.from('categorias_ejercicio').select('id, nombre, metrica, unidad'),
  ])

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
          <span className="ficha-chip-label">Acceso</span>
          {accesoActivo ? (
            <span className="susc-pill activa">● Al día · hasta {fmtFecha(finAcceso)}</span>
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

        {/* Gestión de sus accesos: añadir plan, renovar, baja individual */}
        <div className="admin-section" style={{ marginTop: 24 }}>
          <GestorSuscripciones
            alumnoId={alumno.id}
            suscripciones={suscripciones}
            planes={(planesRaw ?? []) as PlanOpcion[]}
          />
        </div>

        {/* Marcas del alumno: lo que va apuntando en su entrenamiento */}
        <div className="admin-section" style={{ marginTop: 24 }}>
          <h2 className="prog-sub" style={{ marginTop: 0 }}>
            Marcas de {nombre.split(' ')[0]}
          </h2>
          <HistorialMarcas
            registros={(registros ?? []) as RegistroFila[]}
            categorias={cats ?? []}
            soloLectura
            vacioTexto="Este alumno todavía no ha apuntado ninguna marca."
          />
        </div>
        </>
      )}
    </>
  )
}
