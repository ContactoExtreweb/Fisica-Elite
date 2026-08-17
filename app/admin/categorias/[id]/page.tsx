import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CategoriaForm from '@/components/CategoriaForm'
import TramosEditor, { type TramoUI } from '@/components/TramosEditor'

export default async function FichaCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: categoria }, { data: tramos }] = await Promise.all([
    supabase.from('categorias_ejercicio').select('*').eq('id', id).single(),
    supabase
      .from('tramos')
      .select('id, nombre, valor_min, valor_max, orden, ejercicios(count)')
      .eq('categoria_id', id)
      .order('orden'),
  ])

  if (!categoria) notFound()

  const tramosUI: TramoUI[] = (tramos ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    valor_min: t.valor_min === null || t.valor_min === undefined ? '' : String(t.valor_min),
    valor_max: t.valor_max === null || t.valor_max === undefined ? '' : String(t.valor_max),
    orden: String(t.orden ?? 0),
    nEjercicios: t.ejercicios?.[0]?.count ?? 0,
  }))

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
        <Link href="/admin/categorias" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a categorías
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Contenido · Categoría</div>
          <h1 className="page-title">{categoria.nombre}</h1>
        </div>
      </div>

      <TramosEditor categoriaId={id} unidad={categoria.unidad} tramos={tramosUI} />

      <CategoriaForm categoria={categoria} />
    </>
  )
}
