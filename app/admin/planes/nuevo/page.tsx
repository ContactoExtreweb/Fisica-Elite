import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PlanForm from '@/components/PlanForm'

export default async function NuevoPlanPage() {
  const supabase = await createClient()
  const { data: categorias } = await supabase
    .from('categorias_ejercicio')
    .select('id, nombre')
    .order('orden')
    .order('nombre')

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
        <Link href="/admin/planes" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a planes
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Contenido · Nuevo plan</div>
          <h1 className="page-title">
            Nuevo <em>plan.</em>
          </h1>
        </div>
      </div>

      <PlanForm categorias={categorias ?? []} />
    </>
  )
}
