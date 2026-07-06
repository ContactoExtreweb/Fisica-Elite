// Ficha de ejercicio del ALUMNO — con vídeo protegido.
//
// SEGURIDAD (clave): pedimos el ejercicio con el cliente normal, así que
// la RLS decide si este alumno puede verlo (especialidad + nivel +
// suscripción activa). La URL de vídeo FIRMADA solo se genera si la RLS
// devolvió la fila. Un alumno sin acceso recibe notFound() y jamás se
// llega a firmar ningún token: no hay forma de sacar el vídeo.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bunnyConfigurado, urlEmbedFirmada } from '@/lib/bunny'
import TabsEjercicio from '@/components/TabsEjercicio'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

export default async function FichaEjercicioAlumno({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // La RLS filtra: si el alumno no tiene acceso a este ejercicio,
  // simplemente no existe para él → notFound().
  const { data: ejercicio } = await supabase
    .from('ejercicios')
    .select('*')
    .eq('id', id)
    .single()

  if (!ejercicio) notFound()

  const { data: faqs } = await supabase
    .from('ejercicio_faqs')
    .select('id, pregunta, respuesta')
    .eq('ejercicio_id', id)
    .order('orden')
    .order('created_at')

  // La firma del embed se genera AQUÍ, en servidor, y solo porque la RLS
  // ya autorizó el acceso a la fila de arriba.
  const embedUrl =
    bunnyConfigurado() && ejercicio.video_id
      ? urlEmbedFirmada(ejercicio.video_id)
      : null

  const tabs = [
    { clave: 'tecnica', etiqueta: 'Técnica', contenido: ejercicio.tecnica },
    { clave: 'errores', etiqueta: 'Errores comunes', contenido: ejercicio.errores_comunes },
    { clave: 'variantes', etiqueta: 'Variantes', contenido: ejercicio.variantes },
    { clave: 'mejoras', etiqueta: 'Mejoras', contenido: ejercicio.mejoras },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICA<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>
        <nav className="nav">
          <Link href="/inicio">
            <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 12L12 4l9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Hoy
          </Link>
        </nav>
      </aside>

      <main className="main">
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
          <Link href="/inicio" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
            ← Volver a mis ejercicios
          </Link>
        </div>

        <div className="exercise-detail">
          {/* Columna principal */}
          <div>
            <div className="video-frame">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  loading="lazy"
                  allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={ejercicio.titulo}
                />
              ) : (
                <div className="video-sin">
                  El vídeo de este ejercicio estará disponible en breve.
                </div>
              )}
            </div>

            <h1 className="exercise-title">{ejercicio.titulo}</h1>
            {ejercicio.descripcion && (
              <p className="exercise-subtitle">{ejercicio.descripcion}</p>
            )}

            <div className="exercise-tags">
              <span className="plan-tag oposicion">
                {NOMBRE_ESPECIALIDAD[ejercicio.especialidad] ?? ejercicio.especialidad}
              </span>
              <span className={`tag ${ejercicio.nivel}`}>{ejercicio.nivel}</span>
            </div>

            <TabsEjercicio tabs={tabs} />
          </div>

          {/* Columna lateral: FAQ */}
          <aside>
            <div className="aside-card">
              <h4>Preguntas frecuentes</h4>
              {(faqs ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                  No hay preguntas frecuentes para este ejercicio todavía.
                </p>
              ) : (
                <div className="faq-alumno">
                  {faqs!.map((f) => (
                    <details key={f.id}>
                      <summary>{f.pregunta}</summary>
                      <div className="respuesta">{f.respuesta}</div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
