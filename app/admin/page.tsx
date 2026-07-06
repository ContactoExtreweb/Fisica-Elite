// Dashboard del preparador con datos REALES de la BBDD.
// (El layout ya garantiza que solo llega aquí un admin.)
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function saludoYFecha() {
  const ahora = new Date()
  const hora = Number(
    new Intl.DateTimeFormat('es-ES', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Madrid',
    }).format(ahora)
  )
  const saludo =
    hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'

  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  }).format(ahora)

  return { saludo, fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1) }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { saludo, fecha } = saludoYFecha()
  const hoy = new Date().toISOString().slice(0, 10)

  // Contadores reales (head: true → solo el count, sin filas)
  const [{ count: totalAlumnos }, { count: suscActivas }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('rol', 'alumno'),
    supabase
      .from('suscripciones')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy),
  ])

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

      <div className="admin-stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="admin-stat-card">
          <div className="label">Alumnos dados de alta</div>
          <div className="num">{totalAlumnos ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Suscripciones activas</div>
          <div className="num">{suscActivas ?? 0}</div>
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-head">
          <h3>Gestión</h3>
          <div className="meta">Más módulos en camino: vídeos, chat, pagos</div>
        </div>
        <div className="admin-gestion-links">
          <Link href="/admin/alumnos">Ver todos los alumnos →</Link>
          <Link href="/admin/alumnos/nuevo">Dar de alta un alumno →</Link>
        </div>
      </div>
    </>
  )
}
