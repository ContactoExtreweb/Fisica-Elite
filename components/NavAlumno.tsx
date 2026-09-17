'use client'

// Nav del sidebar del alumno.
//
// Secciones: Inicio · Explicaciones · Reservar clase (solo presenciales) ·
// Mi progreso · Pruebas reales · Chat · Suscripción · Mi perfil.
//
// Un alumno SOLO presencial (paga en mano, sin plan online) ve un menú
// reducido: Reservar clase · Chat · Suscripción · Mi perfil. Nada de
// ejercicios ni progreso, porque no tiene contenido.
//
// En móvil no caben todas en la barra inferior: NavSecciones deja las 4
// primeras (Chat incluido, por el badge) y mete el resto en "Más".
//
// IMPORTANTE: úsalo en TODAS las páginas del alumno. Si alguna pinta su
// propio <nav> a mano, se descuadra en cuanto se añade una sección.
import NavSecciones, { type EntradaNav } from '@/components/NavSecciones'

const ICONO = {
  inicio: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 12L12 4l9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  explicaciones: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
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
  progreso: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 19V5m0 14h16M8 15V9m4 6V6m4 9v-4" strokeLinecap="round" strokeLinejoin="round" />
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
  chat: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  suscripcion: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 10h18M7 15h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  perfil: (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

export default function NavAlumno({
  noLeidos = 0,
  presencial = false,
  soloPresencial = false,
}: {
  noLeidos?: number
  /** Tiene activadas las reservas de clase en el centro */
  presencial?: boolean
  /** Presencial SIN plan online: menú reducido */
  soloPresencial?: boolean
}) {
  const chat: EntradaNav = {
    href: '/chat',
    label: 'Chat',
    icono: ICONO.chat,
    noLeidos,
    fijo: true, // el badge de no leídos tiene que verse siempre
  }
  const suscripcion: EntradaNav = {
    href: '/suscripcion',
    label: 'Suscripción',
    icono: ICONO.suscripcion,
  }
  const perfil: EntradaNav = { href: '/perfil', label: 'Mi perfil', icono: ICONO.perfil }
  const reservas: EntradaNav = {
    href: '/reservas',
    label: 'Reservar clase',
    icono: ICONO.reservas,
  }

  const entradas: EntradaNav[] = soloPresencial
    ? [reservas, chat, suscripcion, perfil]
    : [
        { href: '/inicio', label: 'Inicio', icono: ICONO.inicio },
        { href: '/explicaciones', label: 'Explicaciones', icono: ICONO.explicaciones },
        ...(presencial ? [reservas] : []),
        { href: '/registro', label: 'Mi progreso', icono: ICONO.progreso },
        { href: '/evaluaciones', label: 'Pruebas reales', icono: ICONO.evaluaciones },
        chat,
        suscripcion,
        perfil,
      ]

  return <NavSecciones entradas={entradas} />
}
