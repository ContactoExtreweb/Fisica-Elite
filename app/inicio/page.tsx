import { Suspense } from 'react'
// Área del alumno: primera versión REAL.
// La query de ejercicios no filtra nada a propósito: es la RLS de la
// BBDD quien decide qué ve el alumno (especialidad + nivel + suscripción
// activa). Si esta página muestra lo correcto, la seguridad de contenido
// funciona de verdad.
import Link from 'next/link'
import ListaEjerciciosTabs from '@/components/ListaEjerciciosTabs'
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

  const [{ data: perfil }, { data: susc }, { data: ejercicios }, { data: progreso }, { data: puedeSubir }] =
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
        .select('id, slug, titulo, descripcion, nivel, orden, ejercicio_faqs(count)')
        .order('orden')
        .order('titulo'),
      // Progreso del alumno (ids de ejercicios completados)
      supabase.from('progreso').select('ejercicio_id').eq('user_id', user.id).eq('completado', true),
      // ¿Puede subir de nivel? (función de BBDD que valida el 100%)
      supabase.rpc('puedo_subir_de_nivel'),
    ])

  const vigente = susc?.[0]

  // Orden correcto: primero por NIVEL (iniciado < avanzado < profesional),
  // luego por el 'orden' que puso el preparador. El enum no se puede ordenar
  // alfabéticamente (saldría avanzado, iniciado, profesional), así que
  // usamos un rango explícito.
  const RANGO_NIVEL: Record<string, number> = { iniciado: 0, avanzado: 1, profesional: 2 }
  const lista = [...(ejercicios ?? [])].sort((a, b) => {
    const rn = (RANGO_NIVEL[a.nivel] ?? 9) - (RANGO_NIVEL[b.nivel] ?? 9)
    if (rn !== 0) return rn
    return (a.orden ?? 0) - (b.orden ?? 0)
  })

  // Progreso: cuántos de los ejercicios visibles ha completado
  const completados = new Set((progreso ?? []).map((p) => p.ejercicio_id))
  const totalEj = lista.length
  const hechos = lista.filter((e) => completados.has(e.id)).length
  const porcentaje = totalEj > 0 ? Math.round((hechos / totalEj) * 100) : 0
  const listoParaSubir = puedeSubir === true
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

        {/* Progreso del nivel actual */}
        {vigente && totalEj > 0 && (
          <div className="progreso-card">
            <div className="progreso-cab">
              <span className="progreso-titulo">Tu progreso en nivel {perfil?.nivel}</span>
              <span className="progreso-cifra">{hechos}/{totalEj} · {porcentaje}%</span>
            </div>
            <div className="progreso-barra">
              <div className="progreso-relleno" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        )}

        {/* Aviso: listo para subir de nivel */}
        {listoParaSubir && (
          <Link href="/subir-nivel" className="subir-aviso">
            <div className="subir-aviso-emoji">🏅</div>
            <div className="subir-aviso-texto">
              <div className="subir-aviso-titulo">¡Has completado tu nivel!</div>
              <div className="subir-aviso-sub">Estás listo para pasar al siguiente. Pulsa aquí para subir.</div>
            </div>
            <span className="subir-aviso-flecha">→</span>
          </Link>
        )}

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
          <Suspense fallback={<div className="ex-list"><div className="admin-tabla-vacia">Cargando…</div></div>}>
          <ListaEjerciciosTabs
            nivelAlumno={perfil?.nivel ?? 'iniciado'}
            ejercicios={lista.map((e) => ({
              id: e.id,
              slug: e.slug,
              titulo: e.titulo,
              descripcion: e.descripcion,
              nivel: e.nivel,
              nFaqs: e.ejercicio_faqs?.[0]?.count ?? 0,
              completado: completados.has(e.id),
            }))}
          />
          </Suspense>
        )}

        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 16 }}>
          Pulsa un ejercicio para ver el vídeo, la técnica, los errores comunes y las preguntas frecuentes.
        </p>
      </main>
    </div>
  )
}
