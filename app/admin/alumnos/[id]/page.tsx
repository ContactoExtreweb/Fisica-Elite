// Ficha de un alumno para el admin: ver estado, editar datos,
// regenerar contraseña, dar de baja y eliminar.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistorialMarcas from '@/components/HistorialMarcas'
import type { RegistroFila } from '@/lib/marcas'
import AlumnoEditor from '@/components/AlumnoEditor'
import AlumnoAcciones from '@/components/AlumnoAcciones'
import { DIAS_INACTIVIDAD, diasDesde, textoActividad } from '@/lib/actividad'
import GestorSuscripciones, {
  type SuscripcionFila,
  type PlanOpcion,
} from '@/components/GestorSuscripciones'
import { abrirConversacionConAlumno } from '@/app/chat/actions'

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
    .select(
      'id, nombre, apellidos, email, telefono, edad, especialidad, rol, username, created_at, peso_kg, altura_cm, facilidades, cuestionario_completado, presencial, ultima_actividad, aviso_inactividad_at, recordatorios_email'
    )
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
        {!esAdmin && (
          <div className="topbar-actions">
            <form action={abrirConversacionConAlumno.bind(null, alumno.id)}>
              <button type="submit" className="admin-topbar-cta">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Abrir chat
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Resumen de estado */}
      <div className="ficha-resumen">
        <div className="ficha-chip">
          <span className="ficha-chip-label">Oposición</span>
          <span className="plan-tag oposicion">
            {alumno.especialidad
              ? (NOMBRE_ESP[alumno.especialidad] ?? alumno.especialidad)
              : 'Sin oposición'}
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
        <div className="ficha-chip">
          <span className="ficha-chip-label">Última actividad</span>
          <span
            className={`act-pill ${
              accesoActivo &&
              (diasDesde(alumno.ultima_actividad) ?? 0) >= DIAS_INACTIVIDAD
                ? 'inactivo'
                : ''
            }`}
          >
            {textoActividad(diasDesde(alumno.ultima_actividad))}
          </span>
          {alumno.aviso_inactividad_at && (
            <span className="ficha-chip-nota">
              Aviso enviado el {fmtFecha(alumno.aviso_inactividad_at)}
            </span>
          )}
          {alumno.recordatorios_email === false && (
            <span className="ficha-chip-nota">Ha desactivado los recordatorios</span>
          )}
        </div>
        <div className="ficha-chip">
          <span className="ficha-chip-label">Clases en el centro</span>
          {alumno.presencial ? (
            <span className="susc-pill activa">● Presencial</span>
          ) : (
            <span className="susc-pill inactiva">● Solo online</span>
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
          <AlumnoAcciones
            alumnoId={alumno.id}
            nombre={nombre}
            tieneAccesoActivo={accesoActivo}
            presencial={!!alumno.presencial}
          />
        </div>

        {/* Gestión de sus accesos: añadir plan, renovar, baja individual */}
        <div className="admin-section" style={{ marginTop: 24 }}>
          <div className="admin-section-head">
            <h3>Accesos</h3>
            <div className="meta">Planes contratados</div>
          </div>
          <div className="admin-section-body">
            <GestorSuscripciones
              alumnoId={alumno.id}
              suscripciones={suscripciones}
              planes={(planesRaw ?? []) as PlanOpcion[]}
            />
          </div>
        </div>

        {/* Lo que el alumno contestó en el cuestionario inicial. El cliente
            lo pidió expresamente: peso y altura actualizables por el alumno
            "para que lo vean los entrenadores". Solo lectura: los edita él. */}
        <div className="admin-section" style={{ marginTop: 24 }}>
          <div className="admin-section-head">
            <h3>Datos físicos</h3>
            <div className="meta">De su cuestionario inicial</div>
          </div>
          <div className="admin-section-body">
            {alumno.cuestionario_completado ? (
              <div className="ficha-fisicos">
                <div className="ficha-fisico">
                  <span className="ficha-fisico-k">Peso</span>
                  <span className="ficha-fisico-v">
                    {alumno.peso_kg ? `${alumno.peso_kg} kg` : '—'}
                  </span>
                </div>
                <div className="ficha-fisico">
                  <span className="ficha-fisico-k">Altura</span>
                  <span className="ficha-fisico-v">
                    {alumno.altura_cm ? `${alumno.altura_cm} cm` : '—'}
                  </span>
                </div>
                <div className="ficha-fisico ancho">
                  <span className="ficha-fisico-k">Qué tiene para entrenar en casa</span>
                  <span className="ficha-fisico-v">
                    {alumno.facilidades?.trim() || 'No lo ha indicado.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="admin-tabla-vacia">
                Todavía no ha hecho el cuestionario inicial.
              </div>
            )}
          </div>
        </div>

        {/* Marcas del alumno: lo que va apuntando en su entrenamiento */}
        <div className="admin-section" style={{ marginTop: 24 }}>
          <div className="admin-section-head">
            <h3>Marcas de {nombre.split(' ')[0]}</h3>
            <div className="meta">Últimas 40</div>
          </div>
          <div className="admin-section-body">
            <HistorialMarcas
              registros={(registros ?? []) as RegistroFila[]}
              categorias={cats ?? []}
              soloLectura
              vacioTexto="Este alumno todavía no ha apuntado ninguna marca."
            />
          </div>
        </div>
        </>
      )}
    </>
  )
}
