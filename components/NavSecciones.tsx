'use client'

// Barra de secciones compartida por el alumno y el admin.
//
// EL PROBLEMA QUE RESUELVE: en escritorio es el sidebar vertical y caben
// todas, pero en móvil se convierte en la barra inferior, donde solo hay
// sitio para 5. Al añadir secciones (Explicaciones, Reservar clase…) las
// últimas —Suscripción y Mi perfil— se salían de la pantalla y no había
// forma de llegar a ellas.
//
// Solución: en móvil se quedan en la barra las 4 que más se usan y el
// resto se agrupan en un botón "Más" que abre una hoja. En escritorio no
// cambia nada: el sidebar las sigue pintando todas, en orden.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BadgeNoLeidos from '@/components/BadgeNoLeidos'

export type EntradaNav = {
  href: string
  label: string
  icono: React.ReactNode
  /** Activa solo con la ruta exacta (por defecto basta el prefijo) */
  exacto?: boolean
  /** Badge de no leídos del chat (se actualiza en vivo) */
  noLeidos?: number
  /** Badge con un número fijo (p. ej. solicitudes pendientes) */
  badge?: number
  /** Nunca va a "Más": se queda siempre en la barra de móvil */
  fijo?: boolean
}

// Huecos de la barra inferior. Si sobran entradas, el último lo ocupa "Más".
const HUECOS = 5

export default function NavSecciones({ entradas }: { entradas: EntradaNav[] }) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)

  const esActiva = (e: EntradaNav) =>
    e.exacto === false ? pathname.startsWith(e.href) : pathname === e.href

  // Qué se queda en la barra y qué se va a "Más" (solo afecta a móvil)
  const { extra, enBarra } = useMemo(() => {
    if (entradas.length <= HUECOS) return { extra: [], enBarra: new Set(entradas.map((e) => e.href)) }
    const fijos = entradas.filter((e) => e.fijo)
    const sueltos = entradas.filter((e) => !e.fijo)
    const dentro = new Set([
      ...sueltos.slice(0, HUECOS - 1 - fijos.length).map((e) => e.href),
      ...fijos.map((e) => e.href),
    ])
    return { extra: entradas.filter((e) => !dentro.has(e.href)), enBarra: dentro }
  }, [entradas])

  // Al navegar se cierra sola (incluido el botón "atrás" del navegador).
  // Se ajusta en el render, no en un efecto, para no encadenar renders.
  const [rutaVista, setRutaVista] = useState(pathname)
  if (rutaVista !== pathname) {
    setRutaVista(pathname)
    setAbierto(false)
  }

  // Esc la cierra sin tener que apuntar al aspa
  useEffect(() => {
    if (!abierto) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abierto])

  const pintar = (e: EntradaNav, enHoja: boolean) => (
    <Link
      key={e.href}
      href={e.href}
      className={`${esActiva(e) ? 'active' : ''} ${!enHoja && !enBarra.has(e.href) ? 'nav-extra' : ''}`}
      onClick={() => setAbierto(false)}
    >
      <span className="nav-icono-wrap">
        {e.icono}
        {/* El badge en vivo solo se monta una vez: su entrada nunca va a la hoja */}
        {e.noLeidos !== undefined && <BadgeNoLeidos inicial={e.noLeidos} />}
        {e.badge !== undefined && e.badge > 0 && (
          <span className="nav-badge">{e.badge > 99 ? '99+' : e.badge}</span>
        )}
      </span>
      {e.label}
    </Link>
  )

  return (
    <>
      <nav className="nav">
        {entradas.map((e) => pintar(e, false))}

        {extra.length > 0 && (
          <button
            type="button"
            className={`nav-mas ${extra.some(esActiva) ? 'activo' : ''}`}
            onClick={() => setAbierto(true)}
            aria-expanded={abierto}
            aria-label="Más secciones"
          >
            <span className="nav-icono-wrap">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
              </svg>
            </span>
            Más
          </button>
        )}
      </nav>

      {abierto && extra.length > 0 && (
        <>
          <div className="nav-hoja-fondo" onClick={() => setAbierto(false)} role="presentation" />
          <div className="nav-hoja" role="dialog" aria-modal="true" aria-label="Más secciones">
            <div className="nav-hoja-cab">
              <span>Más secciones</span>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <nav className="nav nav-hoja-lista">{extra.map((e) => pintar(e, true))}</nav>
          </div>
        </>
      )}
    </>
  )
}
