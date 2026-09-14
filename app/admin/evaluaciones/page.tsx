// Bandeja de pruebas reales: los vídeos que suben los alumnos cada 6
// semanas, para que el preparador los corrija.
//
// Las pendientes primero y las más antiguas arriba: el alumno que lleva
// más tiempo esperando es el que hay que atender antes.
import { createClient } from '@/lib/supabase/server'
import CorregirEvaluacion from '@/components/CorregirEvaluacion'
import VentanasEvaluacion from '@/components/VentanasEvaluacion'
import { ventanasActivas } from '@/lib/evaluaciones'
import { bunnyConfigurado, urlEmbedFirmada } from '@/lib/bunny'

export const metadata = { title: 'Pruebas reales' }

type Fila = {
  id: string
  fecha_examen: string
  video_id: string | null
  notas_alumno: string | null
  estado: 'pendiente' | 'revisada'
  feedback: string | null
  user_id: string
  profiles: { nombre: string | null; apellidos: string | null } | { nombre: string | null; apellidos: string | null }[] | null
  categorias_ejercicio: { nombre: string } | { nombre: string }[] | null
}

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function diasDesde(iso: string): number {
  const hoy = new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  ).getTime()
  return Math.round((hoy - new Date(iso + 'T00:00:00Z').getTime()) / 86_400_000)
}

export default async function AdminEvaluacionesPage() {
  const supabase = await createClient()

  // OJO: el select en UNA sola cadena literal (si se parte con '+',
  // supabase-js pierde los tipos). Ver lib/suscripciones.ts.
  const [{ data, error }, ventanas, { data: cats }] = await Promise.all([
    supabase
      .from('evaluaciones')
      .select(
        'id, fecha_examen, video_id, notas_alumno, estado, feedback, user_id, profiles(nombre, apellidos), categorias_ejercicio(nombre)'
      )
      .order('estado', { ascending: true })
      .order('fecha_examen', { ascending: true }),
    ventanasActivas(supabase),
    supabase
      .from('categorias_ejercicio')
      .select('id, nombre')
      .eq('activa', true)
      .order('orden'),
  ])

  if (error) {
    return <p className="form-error">Error cargando las pruebas: {error.message}</p>
  }

  const filas = (data ?? []) as unknown as Fila[]
  const pendientes = filas.filter((f) => f.estado === 'pendiente')
  const revisadas = filas.filter((f) => f.estado === 'revisada').reverse()

  const tarjeta = (f: Fila) => {
    const p = rel(f.profiles)
    const nombre = [p?.nombre, p?.apellidos].filter(Boolean).join(' ') || 'Alumno'
    const categoria = rel(f.categorias_ejercicio)?.nombre ?? 'General'
    const dias = diasDesde(f.fecha_examen)

    return (
      <article key={f.id} className="eval-adm-item">
        <div className="eval-adm-cab">
          <div>
            <div className="eval-adm-alumno">{nombre}</div>
            <div className="eval-adm-meta">
              {categoria} · {fmt(f.fecha_examen)}
            </div>
          </div>
          {f.estado === 'pendiente' && (
            <span className={`eval-pill ${dias >= 7 ? 'urgente' : 'pendiente'}`}>
              {dias <= 0
                ? 'Hoy'
                : `Esperando ${dias} ${dias === 1 ? 'día' : 'días'}`}
            </span>
          )}
        </div>

        <div className="eval-adm-cuerpo">
          {f.video_id && bunnyConfigurado() ? (
            <div className="video-frame">
              <iframe
                src={urlEmbedFirmada(f.video_id)}
                loading="lazy"
                allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`Prueba de ${nombre} · ${categoria}`}
              />
            </div>
          ) : (
            <div className="admin-tabla-vacia">Sin vídeo disponible.</div>
          )}

          <div>
            {f.notas_alumno && (
              <div className="eval-notas">
                <span className="eval-notas-label">Lo que cuenta el alumno</span>
                <p>{f.notas_alumno}</p>
              </div>
            )}
            <CorregirEvaluacion id={f.id} estado={f.estado} feedback={f.feedback} />
          </div>
        </div>
      </article>
    )
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">
            Pruebas reales · {pendientes.length} por corregir
          </div>
          <h1 className="page-title">
            Vídeos de tus <em>alumnos.</em>
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 12, fontSize: 15, maxWidth: 620 }}>
            Cada 6 semanas tus alumnos se graban haciendo la prueba de verdad.
            Aquí las ves, corriges la técnica y compruebas que el tramo que
            tienen asignado es el que les toca.
          </p>
        </div>
      </div>

      {/* Los plazos mandan: sin uno abierto, nadie puede subir */}
      <div className="admin-section" style={{ marginBottom: 24 }}>
        <VentanasEvaluacion
          ventanas={ventanas}
          categorias={(cats ?? []) as { id: string; nombre: string }[]}
        />
      </div>

      {pendientes.length === 0 ? (
        <div className="admin-section">
          <div className="admin-tabla-vacia">
            No hay pruebas pendientes de corregir.
          </div>
        </div>
      ) : (
        <div className="eval-adm-lista">{pendientes.map(tarjeta)}</div>
      )}

      {revisadas.length > 0 && (
        <>
          <h2 className="prog-sub" style={{ marginTop: 32 }}>
            Ya corregidas ({revisadas.length})
          </h2>
          <div className="eval-adm-lista">{revisadas.map(tarjeta)}</div>
        </>
      )}
    </>
  )
}
