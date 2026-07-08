// Página donde el alumno confirma la subida de nivel.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonSubirNivel from '@/components/BotonSubirNivel'

const SIGUIENTE: Record<string, string> = {
  iniciado: 'Avanzado',
  avanzado: 'Profesional',
}

export default async function SubirNivelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: perfil }, { data: puede }] = await Promise.all([
    supabase.from('profiles').select('nivel').eq('id', user.id).single(),
    supabase.rpc('puedo_subir_de_nivel'),
  ])

  const nivelActual = perfil?.nivel ?? 'iniciado'
  const siguiente = SIGUIENTE[nivelActual]
  const listo = puede === true

  return (
    <div className="subir-pagina">
      <div className="subir-pagina-inner">
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
          <Link href="/inicio" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
            ← Volver a mis ejercicios
          </Link>
        </div>

        <div className="subir-hero">
          {!siguiente ? (
            <>
              <div className="subir-hero-emoji">👑</div>
              <h1>Ya estás en el nivel máximo</h1>
              <p>Eres nivel <strong>Profesional</strong>. Has llegado a lo más alto. ¡A seguir entrenando!</p>
            </>
          ) : listo ? (
            <>
              <div className="subir-hero-emoji">🚀</div>
              <h1>Listo para subir a {siguiente}</h1>
              <p>
                Has completado todos los ejercicios de tu nivel <strong>{nivelActual}</strong>.
                Al subir, se te desbloqueará el contenido de nivel <strong>{siguiente}</strong> y
                empezarás a entrenar ejercicios nuevos.
              </p>
              <div style={{ marginTop: 24 }}>
                <BotonSubirNivel />
              </div>
            </>
          ) : (
            <>
              <div className="subir-hero-emoji">💪</div>
              <h1>Aún te queda para subir</h1>
              <p>
                Para pasar a <strong>{siguiente}</strong> tienes que completar todos los
                ejercicios de tu nivel actual. Vuelve a tus ejercicios y sigue marcándolos
                según los domines.
              </p>
              <Link href="/inicio" className="cta-primary" style={{ marginTop: 20, width: 'auto', padding: '12px 24px', display: 'inline-block' }}>
                Ver mis ejercicios
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
