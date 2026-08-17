// Bloque para la FICHA DE UN EJERCICIO: apuntar la marca de ese ejercicio
// sin salir de la página, más sus últimas marcas de esa categoría.
//
// Se inserta con una sola línea (ver la guía de la Fase 3c):
//   <BloqueMarcaEjercicio ejercicioId={ejercicio.id} categoriaId={ejercicio.categoria_id} />
import { createClient } from '@/lib/supabase/server'
import FormularioMarca from '@/components/FormularioMarca'
import HistorialMarcas from '@/components/HistorialMarcas'
import type { RegistroFila } from '@/lib/marcas'

export default async function BloqueMarcaEjercicio({
  ejercicioId,
  categoriaId,
}: {
  ejercicioId: string
  categoriaId: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: cat }, { data: registros }] = await Promise.all([
    supabase
      .from('categorias_ejercicio')
      .select('id, nombre, metrica, unidad')
      .eq('id', categoriaId)
      .single(),
    supabase
      .from('registros_entrenamiento')
      .select('id, fecha, repeticiones, peso_kg, distancia_km, tiempo_seg, series, notas, categoria_id')
      .eq('user_id', user.id)
      .eq('categoria_id', categoriaId)
      .order('fecha', { ascending: false })
      .limit(6),
  ])

  if (!cat) return null
  const categorias = [cat]

  return (
    <section className="marca-bloque-ej">
      <FormularioMarca
        categorias={categorias}
        categoriaFija={cat.id}
        ejercicioId={ejercicioId}
        titulo="Apuntar mi marca"
      />

      <div className="marca-bloque-hist">
        <h3 className="prog-sub">Tus últimas marcas en {cat.nombre}</h3>
        <HistorialMarcas
          registros={(registros ?? []) as RegistroFila[]}
          categorias={categorias}
          vacioTexto="Aún no has apuntado ninguna marca en este ejercicio."
        />
      </div>
    </section>
  )
}
