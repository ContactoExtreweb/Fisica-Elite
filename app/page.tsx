// Home pública mínima. La landing real (inicio · sobre nosotros ·
// contacto · legal) se construye en su propia fase.
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="home-hero">
      <div>
        <div className="brand">
          FÍSICA<span className="accent">.</span>ELITE
        </div>
        <div className="brand-sub">Cáceres · Online</div>
      </div>

      <div className="home-hero-body">
        <h1>
          Prepara tu oposición
          <br />
          <em>con método.</em>
        </h1>
        <p>
          Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas.
          Entrena con el plan de tu preparador, a tu ritmo y donde quieras.
        </p>
        <Link href="/login" className="cta-primary home-cta">
          Acceder a la plataforma
        </Link>
      </div>

      <div className="login-foot">© Física Elite Cáceres · 2026</div>
    </div>
  )
}
