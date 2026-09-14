'use client'

// Nav del sidebar del alumno, con el badge de no leídos sobre Chat.
// Secciones: Inicio · Mi progreso · Chat · Suscripción · Mi perfil.
//
// IMPORTANTE: úsalo en TODAS las páginas del alumno. Si alguna pinta su
// propio <nav> a mano, se descuadra en cuanto se añade una sección.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BadgeNoLeidos from '@/components/BadgeNoLeidos'

export default function NavAlumno({ noLeidos = 0 }: { noLeidos?: number }) {
  const pathname = usePathname()
  const activo = (href: string) => (pathname === href ? 'active' : '')

  return (
    <nav className="nav">
      <Link href="/inicio" className={activo('/inicio')}>
        <span className="nav-icono-wrap">
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M3 12L12 4l9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Inicio
      </Link>

      <Link href="/registro" className={activo('/registro')}>
        <span className="nav-icono-wrap">
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M4 19V5m0 14h16M8 15V9m4 6V6m4 9v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Mi progreso
      </Link>

      <Link href="/evaluaciones" className={activo('/evaluaciones')}>
        <span className="nav-icono-wrap">
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path
              d="M15 10l4.55-2.28A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.89L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Pruebas reales
      </Link>

      <Link href="/chat" className={activo('/chat')}>
        <span className="nav-icono-wrap">
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <BadgeNoLeidos inicial={noLeidos} />
        </span>
        Chat
      </Link>

      <Link href="/suscripcion" className={activo('/suscripcion')}>
        <span className="nav-icono-wrap">
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M3 10h18M7 15h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Suscripción
      </Link>

      <Link href="/perfil" className={activo('/perfil')}>
        <span className="nav-icono-wrap">
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path
              d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Mi perfil
      </Link>
    </nav>
  )
}
