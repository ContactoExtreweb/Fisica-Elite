// Área del alumno: primera versión REAL.
// La query de ejercicios no filtra nada a propósito: es la RLS de la
// BBDD quien decide qué ve el alumno (especialidad + nivel + suscripción
// activa). Si esta página muestra lo correcto, la seguridad de contenido
// funciona de verdad.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'
import NavAlumno from '@/components/NavAlumno'
import { contarNoLeidos } from '@/lib/no-leidos'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

function formatoFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default async function InicioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date().toISOString().slice(0, 10)
  const noLeidos = await contarNoLeidos()

  const [{ data: perfil }, { data: susc }, { data: ejercicios }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('nombre, apellidos, nivel, especialidad')
        .eq('id', user.id)
        .single(),
      supabase
        .from('suscripciones')
        .select('fecha_fin')
        .eq('user_id', user.id)
        .eq('estado', 'activa')
        .gte('fecha_fin', hoy)
        .order('fecha_fin', { ascending: false })
        .limit(1),
      // Sin filtros: la RLS decide qué ejercicios existen para este alumno
      supabase
        .from('ejercicios')
        .select('id, titulo, descripcion, nivel, ejercicio_faqs(count)')
        .order('orden')
        .order('titulo'),
    ])

  const vigente = susc?.[0]
  const lista = ejercicios ?? []
  const nombrePila = perfil?.nombre?.split(' ')[0] || 'alumno'

  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() ||
    'FE'

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICA<span className="accent">.</span>ELITE
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
            <form action={logout}>
              <button type="submit" className="sidebar-logout">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="greeting">
              {perfil?.especialidad
                ? `${NOMBRE_ESPECIALIDAD[perfil.especialidad]} · Nivel ${perfil.nivel}`
                : 'Sin especialidad asignada'}
            </div>
            <h1 className="page-title">
              Hola, <em>{nombrePila}.</em>
            </h1>
          </div>
          <div className="topbar-actions">
            {vigente ? (
              <span className="status-pill">
                <span className="dot"></span> Acceso activo · hasta{' '}
                {formatoFecha(vigente.fecha_fin)}
              </span>
            ) : (
              <span className="status-pill bad">
                <span className="dot"></span> Sin suscripción activa
              </span>
            )}
          </div>
        </div>

        <div className="section-label">Tus ejercicios</div>

        {lista.length === 0 ? (
          <div className="ex-list">
            <div className="admin-tabla-vacia">
              {vigente
                ? 'Tu preparador todavía no ha publicado ejercicios para tu especialidad y nivel.'
                : 'Tu suscripción no está activa. Habla con tu preparador para renovar el acceso.'}
            </div>
          </div>
        ) : (
          <div className="ex-list">
            {lista.map((e) => {
              const nFaqs = e.ejercicio_faqs?.[0]?.count ?? 0
              return (
                <Link
                  key={e.id}
                  href={`/ejercicio/${e.id}`}
                  className="ex-list-row"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ex-thumb"></div>
                  <div>
                    <div className="ex-list-name">{e.titulo}</div>
                    <div className="ex-list-meta">
                      {e.descripcion
                        ? e.descripcion.length > 90
                          ? e.descripcion.slice(0, 90) + '…'
                          : e.descripcion
                        : 'Sin descripción'}
                      {nFaqs > 0 && ` · ${nFaqs} pregunta${nFaqs === 1 ? '' : 's'} frecuente${nFaqs === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <span className={`tag ${e.nivel}`}>{e.nivel}</span>
                </Link>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 16 }}>
          Pulsa un ejercicio para ver el vídeo, la técnica, los errores comunes y las preguntas frecuentes.
        </p>
      </main>
    </div>
  )
}
