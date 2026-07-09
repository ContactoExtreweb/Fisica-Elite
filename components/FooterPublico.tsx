import Link from 'next/link'

export default function FooterPublico() {
  return (
    <footer className="footer-pub">
      <div className="footer-pub-inner">
        <div className="footer-pub-col footer-pub-marca-col">
          <div className="footer-pub-marca">
            FÍSICA<span>.</span>ÉLITE
          </div>
          <p>
            Preparación física para oposiciones en Cáceres y online. Entrena con
            método y llega a tu prueba en tu mejor forma.
          </p>
        </div>

        <div className="footer-pub-col">
          <h4>Navegación</h4>
          <Link href="/">Inicio</Link>
          <Link href="/sobre-nosotros">Sobre nosotros</Link>
          <Link href="/instalaciones">Instalaciones</Link>
          <Link href="/precios">Precios</Link>
          <Link href="/contacto">Contacto</Link>
        </div>

        <div className="footer-pub-col">
          <h4>Oposiciones</h4>
          <span>Policía Local</span>
          <span>Policía Nacional</span>
          <span>Guardia Civil</span>
          <span>Fuerzas Armadas</span>
        </div>

        <div className="footer-pub-col">
          <h4>Contacto</h4>
          <a href="mailto:info@fisicaelite.es">info@fisicaelite.es</a>
          <a href="tel:+34600000000">600 00 00 00</a>
          <span>Cáceres, España</span>
          <Link href="/login" className="footer-pub-acceso">Acceso alumnos →</Link>
        </div>
      </div>

      <div className="footer-pub-legal">
        <span>© {new Date().getFullYear()} Física Élite · Cáceres</span>
        <div className="footer-pub-legal-links">
          <Link href="/legal/aviso-legal">Aviso legal</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  )
}
