// La URL pública de la web, en un solo sitio.
//
// Se configura con NEXT_PUBLIC_SITE_URL (en Vercel, cuando haya dominio:
// https://tudominio.es, sin barra final). Si no está, se usa la de Vercel,
// que la pone sola, y en local http://localhost:3000. Así, al comprar el
// dominio se cambia UNA variable de entorno y no hay que tocar código.
//
// La usan: metadataBase (layout), sitemap.ts y robots.ts.

export const SITE_URL: string = (() => {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (explicita) return explicita
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL // la pone Vercel sola
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
})()

/**
 * Origen desde el que construir las URL de vuelta de Stripe (éxito/cancelar).
 *
 * Antes se fiaba del encabezado Origin tal cual. Cualquiera puede mandar la
 * petición con el Origin que quiera, y así el pago acababa redirigiendo a una
 * web ajena (útil para un phishing: paga en el Stripe REAL y aterriza en una
 * copia). Ahora solo vale el Origin si es este mismo sitio (mismo host que la
 * petición, que es lo que pasa desde el navegador, también en local con la IP
 * de la red); si no, se usa la URL configurada.
 */
export function origenSeguro(request: Request): string {
  const origen = request.headers.get('origin')
  if (origen) {
    try {
      if (new URL(origen).host === request.headers.get('host')) return origen
    } catch {
      // Origin mal formado: se ignora
    }
  }
  return SITE_URL
}
