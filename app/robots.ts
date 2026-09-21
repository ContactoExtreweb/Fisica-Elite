// robots.txt: qué pueden rastrear los buscadores.
//
// Solo la web pública. El área del alumno, el panel de admin y la API no
// tienen nada que hacer en un buscador (además, están detrás de login).
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/inicio',
          '/ejercicios',
          '/ejercicio/',
          '/explicaciones',
          '/registro',
          '/reservas',
          '/perfil',
          '/suscripcion',
          '/evaluaciones',
          '/chat',
          '/bienvenida',
          '/cambiar-password',
          '/pago/',
          '/login',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
