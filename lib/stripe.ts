// Cliente Stripe — SOLO servidor. La secret key nunca llega al navegador.
//
// NO fijamos apiVersion en el constructor: cada versión del SDK espera una
// cadena de versión concreta, y fijar otra rompe el build por tipos. El SDK
// usa por defecto la versión con la que se publicó. La versión de la CUENTA
// se fija en el dashboard de Stripe (Developers → API version), que es donde
// de verdad importa para congelar el comportamiento.
import 'server-only'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// Precio por mes en céntimos. AJUSTA al precio real del cliente.
// (En un solo sitio; si algún día hay varios planes, puede venir de la BBDD.)
// OJO: el formulario del cliente tiene el mismo número hardcoded para mostrar
// el total en pantalla — si cambias esto, cambia también precioMes en
// components/FormularioPrecios.tsx.
export const PRECIO_MES_CENTIMOS = 3900 // 39,00 €
export const MONEDA = 'eur'

export function stripeConfigurado() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
