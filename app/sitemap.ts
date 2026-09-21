// sitemap.xml: las páginas públicas, para que los buscadores las encuentren.
//
// Las fichas de oposición salen de FICHAS (lib/oposiciones.ts): si se añade
// una, entra sola. La dirección base sale de NEXT_PUBLIC_SITE_URL.
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { FICHAS } from '@/lib/oposiciones'

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date()
  const fijas: { ruta: string; prioridad: number }[] = [
    { ruta: '/', prioridad: 1 },
    { ruta: '/oposiciones', prioridad: 0.9 },
    { ruta: '/precios', prioridad: 0.9 },
    { ruta: '/sobre-nosotros', prioridad: 0.7 },
    { ruta: '/instalaciones', prioridad: 0.7 },
    { ruta: '/contacto', prioridad: 0.7 },
    { ruta: '/legal/aviso-legal', prioridad: 0.2 },
    { ruta: '/legal/privacidad', prioridad: 0.2 },
    { ruta: '/legal/cookies', prioridad: 0.2 },
  ]

  return [
    ...fijas.map((p) => ({ url: `${SITE_URL}${p.ruta}`, lastModified: ahora, priority: p.prioridad })),
    ...FICHAS.map((f) => ({
      url: `${SITE_URL}/oposiciones/${f.slug}`,
      lastModified: ahora,
      priority: 0.8,
    })),
  ]
}
