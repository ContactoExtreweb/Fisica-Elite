'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const ENLACES = [
  { href: '/', label: 'Inicio' },
  { href: '/sobre-nosotros', label: 'Sobre nosotros' },
  { href: '/instalaciones', label: 'Instalaciones' },
  { href: '/precios', label: 'Precios' },
  { href: '/contacto', label: 'Contacto' },
]

export default function HeaderPublico() {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <Link href="/" className="pub-logo" onClick={() => setAbierto(false)}>
          FÍSICA<span>.</span>ÉLITE
        </Link>

        <nav className="pub-nav">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={pathname === e.href ? 'activo' : ''}
            >
              {e.label}
            </Link>
          ))}
        </nav>

        <div className="pub-header-cta">
          <Link href="/login" className="pub-btn-acceso">
            Acceder
          </Link>
        </div>

        <button
          type="button"
          className="pub-burger"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Menú"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {abierto && (
        <nav className="pub-nav-movil">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} onClick={() => setAbierto(false)}>
              {e.label}
            </Link>
          ))}
          <Link href="/login" className="pub-btn-acceso" onClick={() => setAbierto(false)}>
            Acceder
          </Link>
        </nav>
      )}
    </header>
  )
}
