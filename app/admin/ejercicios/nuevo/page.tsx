import Link from 'next/link'
import EjercicioForm from '@/components/EjercicioForm'

export default function NuevoEjercicioPage() {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
        <Link href="/admin/ejercicios" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a ejercicios
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Nuevo contenido</div>
          <h1 className="page-title">
            Nuevo <em>ejercicio.</em>
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 12, fontSize: 15, maxWidth: 580 }}>
            Completa la ficha y guárdala: pasarás a la pantalla de edición para
            añadir las preguntas frecuentes. El vídeo se conectará en el
            siguiente paso del desarrollo (Bunny Stream).
          </p>
        </div>
      </div>

      <div className="admin-section" style={{ padding: 28, maxWidth: 720 }}>
        <EjercicioForm />
      </div>
    </>
  )
}
