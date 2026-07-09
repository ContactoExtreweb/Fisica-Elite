import Link from 'next/link'

export default function FooterPublico() {
  const anio = new Date().getFullYear()
  return (
    <footer className="pub-footer">
      <div className="pub-footer-inner">
        <div className="pub-footer-marca">
          <div className="pub-logo">
            FÍSICA<span>.</span>ÉLITE
          </div>
          <p>Preparación física para oposiciones. Cáceres y online.</p>
        </div>

        <div className="pub-footer-cols">
          <div className="pub-footer-col">
            <h4>Plataforma</h4>
            <Link href="/precios">Precios</Link>
            <Link href="/login">Acceder</Link>
          </div>
          <div className="pub-footer-col">
            <h4>Física Élite</h4>
            <Link href="/sobre-nosotros">Sobre nosotros</Link>
            <Link href="/instalaciones">Instalaciones</Link>
            <Link href="/contacto">Contacto</Link>
          </div>
          <div className="pub-footer-col">
            <h4>Legal</h4>
            <Link href="/legal/aviso-legal">Aviso legal</Link>
            <Link href="/legal/privacidad">Privacidad</Link>
            <Link href="/legal/cookies">Cookies</Link>
          </div>
        </div>
      </div>

      <div className="pub-footer-base">
        <span>© {anio} Física Élite · Cáceres</span>
        <span>Hecho con esfuerzo, como las oposiciones.</span>
      </div>
    </footer>
  )
}
