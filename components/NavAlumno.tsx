'use client'

// Nav del sidebar del alumno (Hoy · Chat), con el badge de no leídos
// sobre el icono de Chat. Client component para marcar el activo y
// hospedar el badge en vivo.
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
        Hoy
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
    </nav>
  )
}
