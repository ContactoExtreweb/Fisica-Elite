import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlanForm from '@/components/PlanForm'

export default async function FichaPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: plan }, { data: categorias }] = await Promise.all([
    supabase.from('planes').select('*, plan_categorias(categoria_id)').eq('id', id).single(),
    supabase.from('categorias_ejercicio').select('id, nombre').order('orden').order('nombre'),
  ])

  if (!plan) notFound()

  const categoriasDelPlan = (plan.plan_categorias ?? []).map(
    (pc: { categoria_id: string }) => pc.categoria_id
  )

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
        <Link href="/admin/planes" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a planes
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Contenido · Plan</div>
          <h1 className="page-title">{plan.nombre}</h1>
        </div>
      </div>

      <PlanForm plan={plan} categorias={categorias ?? []} categoriasDelPlan={categoriasDelPlan} />
    </>
  )
}
