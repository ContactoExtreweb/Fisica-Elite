// Dashboard del preparador con datos REALES y más completos.
// (El layout ya garantiza que solo llega aquí un admin.)
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

function saludoYFecha() {
  const ahora = new Date()
  const hora = Number(
    new Intl.DateTimeFormat('es-ES', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Madrid',
    }).format(ahora)
  )
  const saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'

  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  }).format(ahora)

  return { saludo, fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1) }
}

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function inicialesDe(nombre?: string | null, apellidos?: string | null) {
  return ((nombre ?? '').charAt(0) + (apellidos ?? '').charAt(0)).toUpperCase() || '??'
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { saludo, fecha } = saludoYFecha()

  const hoy = new Date().toISOString().slice(0, 10)
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const en7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [
    { data: alumnos },
    { data: subsActivas },
    { count: solicitudesPendientes },
    { count: totalEjercicios },
    { count: altasUltimoMes },
    { data: proximasCaducar },
  ] = await Promise.all([
    // Alumnos con su especialidad (para total y desglose por oposición)
    supabase.from('profiles').select('especialidad').eq('rol', 'alumno'),
    // Suscripciones activas vigentes (para contar alumnos con acceso, únicos)
    supabase
      .from('suscripciones')
      .select('user_id')
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy),
    // Solicitudes de alta pendientes de tramitar
    supabase
      .from('solicitudes_alta')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente'),
    // Ejercicios publicados en total
    supabase.from('ejercicios').select('id', { count: 'exact', head: true }),
    // Altas de alumnos en los últimos 30 días
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('rol', 'alumno')
      .gte('created_at', hace30),
    // Suscripciones que caducan en los próximos 7 días (para avisar/renovar)
    supabase
      .from('suscripciones')
      .select('user_id, fecha_fin, profiles!inner(nombre, apellidos)')
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy)
      .lte('fecha_fin', en7dias)
      .order('fecha_fin', { ascending: true }),
  ])

  const listaAlumnos = alumnos ?? []
  const totalAlumnos = listaAlumnos.length
  const conAcceso = new Set((subsActivas ?? []).map((s) => s.user_id)).size
  const sinAcceso = Math.max(0, totalAlumnos - conAcceso)

  // Desglose por oposición
  const desglose = Object.keys(NOMBRE_ESPECIALIDAD)
    .map((clave) => ({
      clave,
      nombre: NOMBRE_ESPECIALIDAD[clave],
      n: listaAlumnos.filter((a) => a.especialidad === clave).length,
    }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n)

  // Próximas caducidades (normalizar profiles objeto/array)
  const caducidades = (proximasCaducar ?? []).map((s) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return {
      nombre: [p?.nombre, p?.apellidos].filter(Boolean).join(' ') || 'Alumno',
      iniciales: inicialesDe(p?.nombre, p?.apellidos),
      fecha_fin: s.fecha_fin as string,
    }
  })

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">{fecha}</div>
          <h1 className="page-title">
            {saludo}, <em>preparador.</em>
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

      {/* Fila de métricas principales */}
      <div className="dash-stats">
        <div className="admin-stat-card">
          <div className="label">Alumnos dados de alta</div>
          <div className="num">{totalAlumnos}</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Con acceso activo</div>
          <div className="num">{conAcceso}</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Sin acceso</div>
          <div className="num">{sinAcceso}</div>
        </div>
        <Link href="/admin/solicitudes" className="admin-stat-card clicable">
          <div className="label">Solicitudes pendientes</div>
          <div className="num">
            {solicitudesPendientes ?? 0}
            {(solicitudesPendientes ?? 0) > 0 && <span className="dash-badge">acción</span>}
          </div>
        </Link>
      </div>

      {/* Segunda fila: más contexto */}
      <div className="dash-stats dash-stats-sec">
        <div className="admin-stat-card mini">
          <div className="label">Altas últimos 30 días</div>
          <div className="num">{altasUltimoMes ?? 0}</div>
        </div>
        <div className="admin-stat-card mini">
          <div className="label">Ejercicios publicados</div>
          <div className="num">{totalEjercicios ?? 0}</div>
        </div>
        <div className="admin-stat-card mini">
          <div className="label">Caducan en 7 días</div>
          <div className="num">{caducidades.length}</div>
        </div>
      </div>

      <div className="dash-cols">
        {/* Próximas caducidades */}
        <div className="admin-section">
          <div className="admin-section-head">
            <h3>Suscripciones por caducar</h3>
            <div className="meta">Próximos 7 días</div>
          </div>
          {caducidades.length === 0 ? (
            <div className="admin-tabla-vacia">Ninguna suscripción caduca esta semana.</div>
          ) : (
            <div className="dash-lista">
              {caducidades.map((c, i) => (
                <div key={i} className="dash-lista-item">
                  <div className="avatar-small">{c.iniciales}</div>
                  <div className="dash-lista-nombre">{c.nombre}</div>
                  <div className="dash-lista-fecha">{fmtFecha(c.fecha_fin)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desglose por oposición */}
        <div className="admin-section">
          <div className="admin-section-head">
            <h3>Alumnos por oposición</h3>
          </div>
          {desglose.length === 0 ? (
            <div className="admin-tabla-vacia">Aún no hay alumnos.</div>
          ) : (
            <div className="dash-desglose">
              {desglose.map((d) => {
                const pct = totalAlumnos > 0 ? Math.round((d.n / totalAlumnos) * 100) : 0
                return (
                  <div key={d.clave} className="dash-desglose-fila">
                    <div className="dash-desglose-cab">
                      <span>{d.nombre}</span>
                      <span className="dash-desglose-n">{d.n}</span>
                    </div>
                    <div className="dash-desglose-barra">
                      <div className="dash-desglose-relleno" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-head">
          <h3>Gestión</h3>
        </div>
        <div className="admin-gestion-links">
          <Link href="/admin/alumnos">Ver todos los alumnos →</Link>
          <Link href="/admin/alumnos/nuevo">Dar de alta un alumno →</Link>
          <Link href="/admin/ejercicios">Gestionar ejercicios →</Link>
          <Link href="/admin/solicitudes">Ver solicitudes →</Link>
        </div>
      </div>
    </>
  )
}
