// Layout de TODO el segmento /admin/*: sidebar + protección por rol.
// Tercera capa de defensa (middleware → layout → cada action).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/AdminNav'
import BotonLogout from '@/components/BotonLogout'
import { contarNoLeidos } from '@/lib/no-leidos'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, nombre')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/inicio')

  const noLeidos = await contarNoLeidos()

  const { count: solicitudesPendientes } = await supabase
    .from('solicitudes_alta')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente')

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            FÍSICA<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub admin">Panel · Preparador</div>
        </div>

        <AdminNav noLeidos={noLeidos} solicitudesPendientes={solicitudesPendientes ?? 0} />

        <div className="sidebar-foot">
          <div className="avatar">FE</div>
          <div>
            <div className="who">{perfil?.nombre ?? 'Física Élite'}</div>
            <BotonLogout variante="texto" />
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar-movil">
          <div className="topbar-movil-marca">FÍSICA<span className="accent">.</span>ELITE</div>
          <BotonLogout variante="icono" />
        </div>
        {children}
      </main>
    </div>
  )
}
