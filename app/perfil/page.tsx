// Perfil del alumno: sus datos (peso, altura, facilidades) y el acceso
// para repetir el cuestionario y reajustar su tramo.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import PerfilForm from '@/components/PerfilForm'

export const metadata = { title: 'Mi perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellidos, peso_kg, altura_cm, facilidades')
    .eq('id', user.id)
    .single()

  const nombreCompleto =
    [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ') || 'Alumno'
  const iniciales =
    ((perfil?.nombre ?? '').charAt(0) + (perfil?.apellidos ?? '').charAt(0)).toUpperCase() || 'FE'

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICA<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Área del alumno</div>
        </div>
        <NavAlumno />
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
            FÍSICA<span className="accent">.</span>ELITE
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
