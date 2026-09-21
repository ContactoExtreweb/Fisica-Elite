'use client'

// Pestañas de la zona de "contenido" del admin. Así no añadimos más
// items a la barra inferior del móvil (que ya va justa de espacio):
// Ejercicios sigue siendo la entrada del nav, y desde ahí se llega a
// Categorías/tramos y Planes/precios.
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/ejercicios', txt: 'Ejercicios' },
  { href: '/admin/categorias', txt: 'Categorías y tramos' },
  { href: '/admin/planes', txt: 'Planes y precios' },
  { href: '/admin/resenas', txt: 'Reseñas' },
]

export default function AdminSubNav() {
  const pathname = usePathname()
  return (
    <div className="admin-subnav">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`admin-subnav-tab ${pathname.startsWith(t.href) ? 'activo' : ''}`}
        >
          {t.txt}
        </Link>
      ))}
    </div>
  )
}
