// Página del cuestionario inicial (primeros pasos del alumno).
// Carga SOLO las categorías que el alumno tiene contratadas (según sus
// planes activos) y calcula el tope de cada slider.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CuestionarioInicial, { type CategoriaCuestionario } from '@/components/CuestionarioInicial'

export const metadata = { title: 'Bienvenido' }

export default async function BienvenidaPage({
  searchParams,
}: {
  searchParams: Promise<{ repetir?: string }>
}) {
  const { repetir } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Si ya completó el cuestionario, a su inicio — salvo que venga a repetirlo
  const { data: perfil } = await supabase
    .from('profiles')
    .select('cuestionario_completado, nombre, peso_kg, altura_cm, facilidades')
    .eq('id', user.id)
    .single()

  if (perfil?.cuestionario_completado && repetir !== '1') redirect('/inicio')

  // Categorías CONTRATADAS: las que cubre algún plan activo del alumno.
  // Reutilizamos la lógica del modelo cargando sus suscripciones + planes.
  const hoy = new Date().toISOString().slice(0, 10)
  const { data: subs } = await supabase
    .from('suscripciones')
    .select('plan_id, estado, fecha_fin, planes(tipo, especialidad, plan_categorias(categoria_id))')
    .eq('user_id', user.id)
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)

  // Determinar el conjunto de categorías contratadas
  const catIds = new Set<string>()
  let accesoCompleto = false
  const oposiciones = new Set<string>()

  for (const s of subs ?? []) {
    const plan = Array.isArray(s.planes) ? s.planes[0] : s.planes
    if (!plan) {
      // suscripción sin plan (compat) = acceso completo
      accesoCompleto = true
      continue
    }
    if (plan.tipo === 'completo') accesoCompleto = true
    else if (plan.tipo === 'ejercicio') {
      for (const pc of plan.plan_categorias ?? []) catIds.add(pc.categoria_id)
    } else if (plan.tipo === 'oposicion' && plan.especialidad) {
      oposiciones.add(plan.especialidad)
    }
  }

  // Si tiene acceso completo o por oposición, incluimos las categorías que
  // tengan ejercicios de esas oposiciones (o todas, si es completo).
  const query = supabase
    .from('categorias_ejercicio')
    .select('id, nombre, metrica, unidad, tramos(valor_max, orden)')
    .eq('activa', true)
    .order('orden')

  const { data: todasCats } = await query

  const categoriasContratadas = (todasCats ?? []).filter((c) => {
    if (accesoCompleto) return true
    if (catIds.has(c.id)) return true
    // Para oposición, incluir si la categoría tiene algún ejercicio de esa oposición
    // (simplificación: si hay oposiciones, mostramos todas las activas)
    if (oposiciones.size > 0) return true
    return false
  })

  // Construir el modelo para el cuestionario, calculando el tope del slider
  const categorias: CategoriaCuestionario[] = categoriasContratadas.map((c) => {
    const tramos = (c.tramos ?? []) as { valor_max: number | null; orden: number }[]
    const maxTramo = tramos
      .map((t) => t.valor_max)
      .filter((v): v is number => v !== null)
      .sort((a, b) => b - a)[0]
    // tope = valor_max más alto + 50%. Si no hay valores, un tope razonable por métrica.
    const topeDefault = c.metrica === 'peso' ? 200 : c.metrica === 'distancia' ? 5000 : 50
    const topeSlider = maxTramo ? Math.ceil(maxTramo * 1.5) : topeDefault
    return {
      id: c.id,
      nombre: c.nombre,
      metrica: c.metrica,
      unidad: c.unidad,
      topeSlider,
    }
  })

  return (
    <main className="cuest-shell">
      <CuestionarioInicial
        categorias={categorias}
        datosFisicos={{
          peso_kg: perfil?.peso_kg ?? null,
          altura_cm: perfil?.altura_cm ?? null,
          facilidades: perfil?.facilidades ?? null,
        }}
      />
    </main>
  )
}
