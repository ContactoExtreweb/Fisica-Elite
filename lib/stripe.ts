// Cliente Stripe — SOLO servidor. La secret key nunca llega al navegador.
//
// IMPORTANTE: la instancia se crea de forma PEREZOSA (solo al usarla), no al
// importar el módulo. Si la creáramos al importar, el `next build` de
// producción evaluaría este archivo con STRIPE_SECRET_KEY aún vacía y
// reventaría con "Neither apiKey nor config.authenticator provided". Así el
// build no depende de que la variable exista en tiempo de construcción; solo
// hace falta en tiempo de ejecución, cuando de verdad se llama a Stripe.
//
// NO fijamos apiVersion en el constructor: cada versión del SDK espera una
// cadena concreta y fijar otra rompe el build por tipos. La versión de la
// CUENTA se fija en el dashboard de Stripe (Developers → API version).
import 'server-only'
import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Devuelve el cliente de Stripe, creándolo la primera vez. Lanza un error
 * claro si falta la clave (en ejecución, no en build).
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY no está configurada en el entorno')
    }
    _stripe = new Stripe(key, { typescript: true })
  }
  return _stripe
}

// Compatibilidad: algunos archivos importan `stripe` como si fuera la
// instancia. Con un Proxy, cualquier acceso (stripe.checkout, etc.) crea el
// cliente perezosamente por debajo, sin romper el build.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const real = getStripe() as unknown as Record<string | symbol, unknown>
    const value = real[prop]
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value
  },
})

// Los PRECIOS no viven aquí: salen de la tabla 'planes' (editable desde
// /admin/planes) y cada endpoint los lee en el servidor. Antes había un
// PRECIO_MES_CENTIMOS fijo de 39 € que se cobraba sin mirar el plan.
export const MONEDA = 'eur'

export function stripeConfigurado() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
