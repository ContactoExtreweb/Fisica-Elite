// Página pública de precios: las dos modalidades visibles + formulario.
import Link from 'next/link'
import FormularioPrecios from '@/components/FormularioPrecios'

export const metadata = {
  title: 'Precios · Física Élite',
  description:
    'Prepara tu oposición con Física Élite. Elige pago por meses o suscripción mensual.',
}

export default function PreciosPage() {
  return (
    <div className="precios-pagina">
      <header className="precios-header">
        <Link href="/" className="brand">
          FÍSICA<span className="accent">.</span>ELITE
        </Link>
        <Link href="/login" className="precios-login-link">
          Ya soy alumno →
        </Link>
      </header>

      <div className="precios-hero">
        <h1>
          Empieza tu <em>preparación.</em>
        </h1>
        <p>
          Elige cómo prefieres pagar. En ambos casos, tu preparador validará
          el alta y te dará acceso personalmente.
        </p>
      </div>

      <FormularioPrecios />
    </div>
  )
}
