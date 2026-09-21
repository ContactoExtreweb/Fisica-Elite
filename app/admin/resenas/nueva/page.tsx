import Link from 'next/link'
import ResenaForm from '@/components/ResenaForm'

export default function NuevaResenaPage() {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
        <Link href="/admin/resenas" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a reseñas
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Contenido · Nueva reseña</div>
          <h1 className="page-title">
            Nueva <em>reseña.</em>
          </h1>
        </div>
      </div>

      <ResenaForm />
    </>
  )
}
