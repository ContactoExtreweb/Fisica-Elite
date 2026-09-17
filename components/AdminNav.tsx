'use client'

// Nav del sidebar del preparador. Igual que el del alumno: en móvil no
// caben las siete en la barra inferior, así que NavSecciones deja las
// cuatro primeras (Chat incluido, por el badge) y el resto va a "Más".
import NavSecciones, { type EntradaNav } from '@/components/NavSecciones'

const ICONO = {
  dashboard: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  alumnos: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <circle cx="17" cy="6" r="2.5" />
      <path d="M16 12c3 0 6 2 6 5" strokeLinecap="round" />
    </svg>
  ),
  solicitudes: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ejercicios: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  ),
  evaluaciones: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path
        d="M15 10l4.55-2.28A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.89L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  reservas: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chat: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export default function AdminNav({
  noLeidos = 0,
  solicitudesPendientes = 0,
}: {
  noLeidos?: number
  solicitudesPendientes?: number
}) {
  // exacto: false = basta con el prefijo (las subrutas también marcan).
  // El dashboard sí es exacto, si no se quedaría siempre encendido.
  const entradas: EntradaNav[] = [
    { href: '/admin', label: 'Dashboard', icono: ICONO.dashboard },
    { href: '/admin/alumnos', label: 'Alumnos', icono: ICONO.alumnos, exacto: false },
    {
      href: '/admin/solicitudes',
      label: 'Solicitudes',
      icono: ICONO.solicitudes,
      exacto: false,
      badge: solicitudesPendientes,
    },
    { href: '/admin/ejercicios', label: 'Ejercicios', icono: ICONO.ejercicios, exacto: false },
    { href: '/admin/evaluaciones', label: 'Pruebas reales', icono: ICONO.evaluaciones, exacto: false },
    { href: '/admin/reservas', label: 'Reservas', icono: ICONO.reservas, exacto: false },
    {
      href: '/admin/chat',
      label: 'Chat',
      icono: ICONO.chat,
      exacto: false,
      noLeidos,
      fijo: true, // el badge de no leídos tiene que verse siempre
    },
  ]

  return <NavSecciones entradas={entradas} />
}
