import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bunnyConfigurado, urlEmbedFirmada } from '@/lib/bunny'
import EjercicioForm from '@/components/EjercicioForm'
import FaqEditor from '@/components/FaqEditor'
import SubirVideo from '@/components/SubirVideo'
import BorrarEjercicio from '@/components/BorrarEjercicio'

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

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

  const bunnyOk = bunnyConfigurado()
  const embedUrl =
    bunnyOk && ejercicio.video_id ? urlEmbedFirmada(ejercicio.video_id) : null

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
        <Link href="/admin/ejercicios" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a ejercicios
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Editar ejercicio</div>
          <h1 className="page-title">{ejercicio.titulo}</h1>
        </div>
      </div>

      {/* Vídeo */}
      <div className="admin-section" style={{ padding: 28, maxWidth: 720 }}>
        <div className="section-label">Vídeo del ejercicio</div>
        {bunnyOk ? (
          <SubirVideo ejercicioId={id} embedUrl={embedUrl} />
        ) : (
          <p className="form-error">
            Bunny Stream no está configurado. Añade las tres variables a
            .env.local (ver PASO-4.md) y reinicia el servidor.
          </p>
        )}
      </div>

      {/* Ficha */}
      <div className="admin-section" style={{ padding: 28, maxWidth: 720 }}>
        <div className="section-label">Ficha</div>
        <EjercicioForm ejercicio={ejercicio} />
      </div>

      <div style={{ maxWidth: 720 }}>
        <FaqEditor ejercicioId={id} faqs={faqs ?? []} />

        <div className="zona-peligro">
          <div>
            <div className="titulo">Borrar este ejercicio</div>
            <div className="desc">
              Se eliminará junto con su vídeo en Bunny, sus preguntas
              frecuentes y el progreso de los alumnos. No se puede deshacer.
            </div>
          </div>
          <BorrarEjercicio id={id} />
        </div>
      </div>
    </>
  )
}
