// "Mi progreso": el alumno apunta su marca del día y ve su histórico.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BotonLogout from '@/components/BotonLogout'
import NavAlumno from '@/components/NavAlumno'
import FormularioMarca from '@/components/FormularioMarca'
import HistorialMarcas from '@/components/HistorialMarcas'
import EvolucionMarcas from '@/components/EvolucionMarcas'
import { categoriasContratadas } from '@/lib/acceso'
import type { RegistroFila } from '@/lib/marcas'

// La gráfica mira hacia atrás más que el listado: una sola consulta sirve
// para las dos cosas (la lista se queda en las 60 más recientes).
const MARCAS_A_LEER = 150
const MARCAS_EN_LISTA = 60

export const metadata = { title: 'Mi progreso' }

export default async function RegistroPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: perfil }, categorias, { data: registros }] = await Promise.all([
    supabase.from('profiles').select('nombre, apellidos, presencial').eq('id', user.id).single(),
    categoriasContratadas(supabase, user.id),
    supabase
      .from('registros_entrenamiento')
      .select('id, fecha, repeticiones, peso_kg, distancia_km, tiempo_seg, series, notas, categoria_id')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MARCAS_A_LEER),
  ])

  const marcas = (registros ?? []) as RegistroFila[]

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
        <NavAlumno presencial={!!perfil?.presencial} />
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
            <div className="greeting">Tu evolución</div>
            <h1 className="page-title">
              Mi <em>progreso.</em>
            </h1>
          </div>
        </div>

        <EvolucionMarcas registros={marcas} categorias={categorias} />

        <div className="prog-layout">
          <div>
            <FormularioMarca categorias={categorias} />
          </div>
          <div>
            <h2 className="prog-sub">Tus últimas marcas</h2>
            <HistorialMarcas
              registros={marcas.slice(0, MARCAS_EN_LISTA)}
              categorias={categorias}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
