// Chat del ALUMNO con su preparador. Una sola conversación.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'
import { obtenerOCrearConversacion } from '@/app/chat/actions'
import VentanaChat, { type Mensaje } from '@/components/VentanaChat'
import NavAlumno from '@/components/NavAlumno'
import { contarNoLeidos } from '@/lib/no-leidos'

export default async function ChatAlumnoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellidos')
    .eq('id', user.id)
    .single()

  const noLeidos = await contarNoLeidos()

  // Abre (o recupera) la conversación del alumno
  const conversacionId = await obtenerOCrearConversacion()

  const { data: mensajes } = await supabase
    .from('mensajes')
    .select('id, conversacion_id, autor_id, contenido, created_at')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: true })

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
              <button type="submit" className="sidebar-logout">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </aside>

      <main className="main chat-main">
        <div className="topbar">
          <div>
            <div className="greeting">Chat con tu preparador</div>
            <h1 className="page-title">
              Habla con <em>Física Élite.</em>
            </h1>
          </div>
        </div>

        <VentanaChat
          conversacionId={conversacionId}
          miId={user.id}
          mensajesIniciales={(mensajes ?? []) as Mensaje[]}
        />
      </main>
    </div>
  )
}
