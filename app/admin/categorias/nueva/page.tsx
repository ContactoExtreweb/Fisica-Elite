import Link from 'next/link'
import CategoriaForm from '@/components/CategoriaForm'

export default function NuevaCategoriaPage() {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24 }}>
        <Link href="/admin/categorias" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a categorías
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Contenido · Nueva categoría</div>
          <h1 className="page-title">
            Nueva <em>categoría.</em>
          </h1>
        </div>
      </div>

      <CategoriaForm />

      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 16 }}>
        Al crearla pasarás a su ficha para añadir los tramos.
      </p>
    </>
  )
}
