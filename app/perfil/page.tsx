// Perfil del alumno: sus datos (peso, altura, facilidades) y el acceso
// para repetir el cuestionario y reajustar su tramo.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import PerfilForm from '@/components/PerfilForm'
import ListaSuscripciones from '@/components/ListaSuscripciones'
import { misSuscripciones, accesoHasta } from '@/lib/suscripciones'
import { contarNoLeidos } from '@/lib/no-leidos'
import { modoAlumno } from '@/lib/reservas'

export const metadata = { title: 'Mi perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: perfil }, suscripciones, noLeidos, modo] = await Promise.all([
    supabase
      .from('profiles')
      .select('nombre, apellidos, peso_kg, altura_cm, facilidades')
      .eq('id', user.id)
      .single(),
    misSuscripciones(supabase, user.id),
    contarNoLeidos(),
    modoAlumno(supabase, user.id),
  ])

  const vigentes = suscripciones.filter((s) => s.vigente)
  const finAcceso = accesoHasta(suscripciones)

  const nombreCompleto =
    [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
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
        <NavAlumno
          noLeidos={noLeidos}
          presencial={modo.presencial}
          soloPresencial={modo.presencial && !modo.online}
        />
        <div className="sidebar-foot">
          <div className="avatar">{iniciales}</div>
          <div>
            <div className="who">{nombreCompleto}</div>
            <BotonLogout variante="texto" />
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar-movil">
          <div className="topbar-movil-marca">
            FÍSICAS<span className="accent">.</span>ELITE
          </div>
          <BotonLogout variante="icono" />
        </div>
        <div className="topbar" style={{ marginBottom: 24 }}>
          <div>
            <div className="greeting">Tu cuenta</div>
            <h1 className="page-title">{nombreCompleto}</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/inicio" className="btn-ghost-chat">
              ← Mis ejercicios
            </Link>
          </div>
        </div>

        <PerfilForm
          peso={perfil?.peso_kg ?? null}
          altura={perfil?.altura_cm ?? null}
          facilidades={perfil?.facilidades ?? null}
        />

        {/* Qué tiene contratado. Solo lectura: gestionar y renovar es
            cosa de /suscripcion. */}
        <div className="perfil-susc">
          <div className="perfil-susc-cab">
            <div>
              <div className="perfil-reeval-tit">Tu suscripción</div>
              <p className="perfil-susc-sub">
                {vigentes.length > 0
                  ? `Acceso hasta el ${new Date(finAcceso as string).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}.`
                  : 'No tienes ningún acceso activo ahora mismo.'}
              </p>
            </div>
            <Link href="/suscripcion" className="btn-ghost-chat">
              Gestionar
            </Link>
          </div>
          <ListaSuscripciones suscripciones={suscripciones} mostrarHistorial={false} />
        </div>

        {/* Repetir cuestionario para reajustar el tramo */}
        <div className="perfil-reeval">
          <div>
            <div className="perfil-reeval-tit">¿Has mejorado tu forma física?</div>
            <p>
              Repite la evaluación inicial para reajustar tu nivel en cada ejercicio a tu marca
              actual.
            </p>
          </div>
          <Link href="/bienvenida?repetir=1" className="btn-ghost-chat">
            Repetir evaluación
          </Link>
        </div>
      </main>
    </div>
  )
}
