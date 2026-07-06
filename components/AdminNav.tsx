'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BadgeNoLeidos from '@/components/BadgeNoLeidos'

const ENLACES = [
  {
    href: '/admin',
    label: 'Dashboard',
    exacto: true,
    icono: (
      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/alumnos',
    label: 'Alumnos',
    exacto: false,
    icono: (
      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
        <circle cx="17" cy="6" r="2.5" />
        <path d="M16 12c3 0 6 2 6 5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/solicitudes',
    label: 'Solicitudes',
    exacto: false,
    icono: (
      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/ejercicios',
    label: 'Ejercicios',
    exacto: false,
    icono: (
      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M10 9l5 3-5 3z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/admin/chat',
    label: 'Chat',
    exacto: false,
    icono: (
      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function AdminNav({
  noLeidos = 0,
  solicitudesPendientes = 0,
}: {
  noLeidos?: number
  solicitudesPendientes?: number
}) {
  const pathname = usePathname()

  return (
    <nav className="nav">
      {ENLACES.map((e) => {
        const activo = e.exacto
          ? pathname === e.href
          : pathname.startsWith(e.href)
        return (
          <Link key={e.href} href={e.href} className={activo ? 'active' : ''}>
            <span className="nav-icono-wrap">
              {e.icono}
              {e.href === '/admin/chat' && <BadgeNoLeidos inicial={noLeidos} />}
              {e.href === '/admin/solicitudes' && solicitudesPendientes > 0 && (
                <span className="nav-badge">
                  {solicitudesPendientes > 99 ? '99+' : solicitudesPendientes}
                </span>
              )}
            </span>
            {e.label}
          </Link>
        )
      })}
    </nav>
  )
}
