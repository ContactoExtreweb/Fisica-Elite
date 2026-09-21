import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResenaForm from '@/components/ResenaForm'

export default async function FichaResenaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: resena } = await supabase
    .from('resenas')
    .select('id, nombre, texto, puntuacion, origen, visible, orden')
    .eq('id', id)
    .single()

  if (!resena) notFound()

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
        <Link href="/admin/resenas" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a reseñas
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Contenido · Reseña</div>
          <h1 className="page-title">{resena.nombre}</h1>
        </div>
      </div>

      <ResenaForm resena={resena} />
    </>
  )
}
