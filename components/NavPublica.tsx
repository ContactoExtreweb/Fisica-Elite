'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ENLACES = [
  { href: '/', txt: 'Inicio' },
  { href: '/sobre-nosotros', txt: 'Sobre nosotros' },
  { href: '/instalaciones', txt: 'Instalaciones' },
  { href: '/precios', txt: 'Precios' },
  { href: '/contacto', txt: 'Contacto' },
]

export default function NavPublica() {
  const [abierto, setAbierto] = useState(false)
  const pathname = usePathname()

  // Bloquear el scroll del fondo cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [abierto])

  // Cerrar el menú al cambiar de página
  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  return (
    <>
      <header className={`nav-pub ${abierto ? 'abierto' : ''}`}>
        <div className="nav-pub-inner">
          <Link href="/" className="nav-pub-marca" onClick={() => setAbierto(false)}>
            FÍSICA<span>.</span>ÉLITE
          </Link>

          <nav className="nav-pub-links">
            {ENLACES.map((e) => (
              <Link key={e.href} href={e.href} className={pathname === e.href ? 'activo' : ''}>
                {e.txt}
              </Link>
            ))}
          </nav>

          <Link href="/login" className="nav-pub-cta">
            Acceder
          </Link>

          {/* Botón hamburguesa (móvil) */}
          <button
            type="button"
            className={`nav-pub-burger ${abierto ? 'abierto' : ''}`}
            onClick={() => setAbierto((v) => !v)}
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={abierto}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Overlay a pantalla completa. SIEMPRE en el DOM; se muestra con la
          clase .abierto. Esto es más fiable en móviles reales que montar/
          desmontar el nodo, que a veces falla al recibir el toque. */}
      <div className={`nav-overlay ${abierto ? 'abierto' : ''}`}>
        <nav className="nav-overlay-links">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={pathname === e.href ? 'activo' : ''}
              onClick={() => setAbierto(false)}
            >
              {e.txt}
            </Link>
          ))}
        </nav>

        <Link href="/login" className="nav-overlay-cta" onClick={() => setAbierto(false)}>
          Acceder a la plataforma
        </Link>

        <div className="nav-overlay-contacto">
          <span>CONTÁCTANOS</span>
          <a href="tel:+34600000000">600 00 00 00</a>
          <a href="mailto:info@fisicaelite.es">info@fisicaelite.es</a>
        </div>
      </div>
    </>
  )
}
