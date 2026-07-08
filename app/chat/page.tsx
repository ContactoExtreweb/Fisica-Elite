// Chat del ALUMNO con su preparador. Una sola conversación.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import { obtenerOCrearConversacion } from '@/app/chat/actions'
import VentanaChat, { type Mensaje } from '@/components/VentanaChat'

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
        <nav className="nav">
          <Link href="/inicio">
            <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 12L12 4l9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Hoy
          </Link>
          <Link href="/chat" className="active">
            <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Chat
          </Link>
        </nav>
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

      <main className="main chat-main">
        <div className="topbar-movil">
          <div className="topbar-movil-marca">FÍSICA<span className="accent">.</span>ELITE</div>
          <BotonLogout variante="icono" />
        </div>
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
