'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FICHAS } from '@/lib/oposiciones'
import { contactoPublico } from '@/lib/legal'

type Enlace = { href: string; txt: string; desplegable?: boolean }

const ENLACES: Enlace[] = [
  { href: '/', txt: 'Inicio' },
  { href: '/oposiciones', txt: 'Oposiciones', desplegable: true },
  { href: '/sobre-nosotros', txt: 'Sobre nosotros' },
  { href: '/instalaciones', txt: 'Instalaciones' },
  { href: '/precios', txt: 'Precios' },
  { href: '/contacto', txt: 'Contacto' },
]

export default function NavPublica() {
  const [abierto, setAbierto] = useState(false)
  const pathname = usePathname()
  const contacto = contactoPublico()

  // Bloquear el scroll del fondo cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [abierto])

  // Cerrar el menú al cambiar de página. Se ajusta EN RENDER, no en un
  // efecto: así no hay un fotograma con el menú abierto sobre la página
  // nueva, y además cubre el botón "atrás" del navegador, que no pasa por
  // el onClick de ningún enlace.
  const [rutaPrevia, setRutaPrevia] = useState(pathname)
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname)
    setAbierto(false)
  }

  // Una sección se marca activa también en sus subpáginas
  const activo = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      <header className={`nav-pub ${abierto ? 'abierto' : ''}`}>
        <div className="nav-pub-inner">
          <Link href="/" className="nav-pub-marca" onClick={() => setAbierto(false)}>
            <Image
              src="/logo.png"
              alt=""
              width={38}
              height={45}
              className="nav-pub-logo"
              priority
            />
            {/* En UN solo span: la marca es un flex con gap, y sin envolver el
                texto cada trozo ("FÍSICAS", ".", "ÉLITE") se separaba con ese
                hueco y el nombre salía ancho y partido. */}
            <span className="nav-pub-nombre">
              FÍSICAS<span>.</span>ÉLITE
            </span>
          </Link>

          <nav className="nav-pub-links">
            {ENLACES.map((e) =>
              e.desplegable ? (
                // Desplegable con las oposiciones. Se abre con el ratón y
                // también con el teclado (:focus-within en el CSS).
                <div key={e.href} className="nav-pub-drop">
                  <Link href={e.href} className={activo(e.href) ? 'activo' : ''}>
                    {e.txt}
                    <span className="nav-pub-drop-flecha" aria-hidden="true">
                      ▾
                    </span>
                  </Link>
                  <div className="nav-pub-drop-panel">
                    {FICHAS.map((f) => (
                      <Link
                        key={f.slug}
                        href={`/oposiciones/${f.slug}`}
                        style={{ ['--cuerpo' as string]: f.color }}
                      >
                        {f.nombre}
                      </Link>
                    ))}
                    <Link href="/oposiciones" className="nav-pub-drop-todas">
                      Cómo las preparamos →
                    </Link>
                  </div>
                </div>
              ) : (
                <Link key={e.href} href={e.href} className={activo(e.href) ? 'activo' : ''}>
                  {e.txt}
                </Link>
              )
            )}
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
            <div key={e.href}>
              <Link
                href={e.href}
                className={activo(e.href) ? 'activo' : ''}
                onClick={() => setAbierto(false)}
              >
                {e.txt}
              </Link>

              {/* En móvil no hay desplegable: las oposiciones se listan
                  debajo, indentadas. Un menú que hay que desplegar con el
                  dedo es justo lo que ya falló una vez aquí. */}
              {e.desplegable && (
                <div className="nav-overlay-sub">
                  {FICHAS.map((f) => (
                    <Link
                      key={f.slug}
                      href={`/oposiciones/${f.slug}`}
                      onClick={() => setAbierto(false)}
                    >
                      {f.nombre}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <Link href="/login" className="nav-overlay-cta" onClick={() => setAbierto(false)}>
          Acceder a la plataforma
        </Link>

        {/* Sin teléfono ni correo dados, el bloque no se pinta */}
        {(contacto.telefono || contacto.email) && (
          <div className="nav-overlay-contacto">
            <span>CONTÁCTANOS</span>
            {contacto.telefono && contacto.telefonoHref && (
              <a href={contacto.telefonoHref}>{contacto.telefono}</a>
            )}
            {contacto.email && <a href={`mailto:${contacto.email}`}>{contacto.email}</a>}
          </div>
        )}
      </div>
    </>
  )
}
