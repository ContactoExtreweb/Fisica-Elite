// Página del alumno: QUÉ tiene contratado, hasta cuándo, y renovación
// ONLINE. Cualquier cuenta existente puede renovar aquí sin crear otra.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import RenovarOnline from '@/components/RenovarOnline'
import ListaSuscripciones from '@/components/ListaSuscripciones'
import { misSuscripciones, accesoHasta } from '@/lib/suscripciones'
import { contarNoLeidos } from '@/lib/no-leidos'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ renovado?: string; cancelado?: string }>
}) {
  const { renovado } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: perfil }, suscripciones, noLeidos] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos').eq('id', user.id).single(),
    misSuscripciones(supabase, user.id),
    contarNoLeidos(),
  ])

  const vigentes = suscripciones.filter((s) => s.vigente)
  const activa = vigentes.length > 0
  const finAcceso = accesoHasta(suscripciones)
  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICAS<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>
        <NavAlumno noLeidos={noLeidos} />
        <div className="sidebar-foot">
          <div className="avatar">{iniciales}</div>
          <div>
            <div className="who">
              {[perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'}
            </div>
            <BotonLogout variante="texto" />
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar-movil">
          <div className="topbar-movil-marca">FÍSICAS<span className="accent">.</span>ELITE</div>
          <BotonLogout variante="icono" />
        </div>
        <div className="topbar">
          <div>
            <div className="greeting">Tu suscripción</div>
            <h1 className="page-title">
              Gestiona tu <em>acceso.</em>
            </h1>
          </div>
        </div>

        {renovado && (
          <div className="aviso-ok">
            ¡Pago recibido! Tu acceso se ha ampliado. Si no ves el cambio al
            instante, recarga en unos segundos.
          </div>
        )}

        <div className="susc-estado-card">
          <div className="susc-estado-icono" style={{ background: activa ? '#DCFCE7' : '#FEE2E2', color: activa ? '#15803D' : '#B91C1C' }}>
            {activa ? '✓' : '!'}
          </div>
          <div>
            <div className="susc-estado-titulo">
              {activa
                ? `${vigentes.length} ${vigentes.length === 1 ? 'plan activo' : 'planes activos'}`
                : 'Sin acceso activo'}
            </div>
            <div className="susc-estado-sub">
              {activa
                ? `Tienes acceso hasta el ${fmt(finAcceso)}.`
                : 'Renueva para volver a acceder a tus entrenamientos.'}
            </div>
          </div>
        </div>

        {/* QUÉ tiene contratado exactamente, no solo si está activa */}
        <div className="admin-section" style={{ padding: 28, marginBottom: 20 }}>
          <h3 className="ficha-seccion-titulo">Lo que tienes contratado</h3>
          <p className="ficha-accion-desc" style={{ maxWidth: '100%', marginBottom: 18 }}>
            Cada plan que has contratado y qué te da acceso.
          </p>
          <ListaSuscripciones suscripciones={suscripciones} />
        </div>

        <div className="admin-section" style={{ padding: 28, maxWidth: 520 }}>
          <h3 className="ficha-seccion-titulo">
            {activa ? 'Ampliar mi acceso' : 'Renovar mi acceso'}
          </h3>
          <p className="ficha-accion-desc" style={{ maxWidth: '100%', marginBottom: 18 }}>
            Elige cuántos meses quieres añadir. Se suman a tu fecha actual.
          </p>
          <RenovarOnline />
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--ink-muted)' }}>
          ¿Prefieres pagar en efectivo con tu preparador?{' '}
          <Link href="/chat" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Escríbele por el chat
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
