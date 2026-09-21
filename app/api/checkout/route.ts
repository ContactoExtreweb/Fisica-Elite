// Crea una sesión de Stripe Checkout para el pago desde la web pública.
//
// Flujo Físicas Élite: quien paga NO se registra solo. Metemos sus datos
// del formulario en la metadata de la sesión; cuando el pago se confirme,
// el WEBHOOK creará una "solicitud de alta pendiente" que un admin tramita.
//
// v2 — SE COMPRA UN PLAN:
//  · El cliente manda un plan_id, NUNCA un precio.
//  · El precio se lee de la tabla 'planes' aquí, en el servidor. Si nos
//    fiáramos del importe que llega en el body, cualquiera podría pagar
//    1 céntimo por el pack completo con un fetch a mano.
//  · Se compra UN plan cada vez (decisión de producto). Para contratar
//    dos, se pasa dos veces por el checkout.
//  · Modalidad única: pago por N meses. La suscripción recurrente se
//    quitó a propósito; estaba a medias y cobraba un precio fijo antiguo.
//  · La OPOSICIÓN ya no se pregunta: si el plan es de tipo 'oposicion',
//    sale del propio plan. Un alumno puede entrenar sin oposición.
import { NextResponse } from 'next/server'
import { stripe, stripeConfigurado, MONEDA } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { generarReferencia } from '@/lib/referencia'
import { consumirLimite, huellaIp, ipDe } from '@/lib/limites'
import { origenSeguro } from '@/lib/site'

// Node runtime (el SDK de Stripe lo necesita; Edge no vale)
export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!stripeConfigurado()) {
    return NextResponse.json({ error: 'Pagos no configurados' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const texto = (k: string) => String(body[k] ?? '').trim()

  // Honeypot anti-bot: un humano no ve ni rellena 'website'. Si viene
  // con algo, lo tratamos como spam y no creamos ningún pago.
  if (texto('website')) {
    return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 400 })
  }

  // Freno por IP: 10 intentos a la hora y 30 al día. Cada llamada crea una
  // sesión en Stripe; sin freno, un script puede inundarla. Generoso para una
  // persona real (aunque comparta wifi). Si el contador falla NO se bloquea el
  // pago: prefiero dejar pasar a perder una venta por un fallo interno.
  const cupo = await consumirLimite(huellaIp('ck', ipDe(request.headers)), 10, 30)
  if (cupo === 'excedido') {
    return NextResponse.json(
      { error: 'Demasiados intentos seguidos. Espera un rato y vuelve a probar.' },
      { status: 429 }
    )
  }

  // --- Datos del solicitante (validación en servidor) ---
  const nombre = texto('nombre')
  const apellidos = texto('apellidos')
  const email = texto('email').toLowerCase()
  const telefono = texto('telefono')
  const genero = texto('genero')
  const username = texto('username')
  const mensaje = texto('mensaje').slice(0, 480) // Stripe limita metadata a 500 chars/valor
  const edadRaw = texto('edad')
  const planId = texto('plan_id')
  const meses = Math.min(24, Math.max(1, Math.floor(Number(body['meses'])) || 1))

  if (!nombre || !apellidos || !email) {
    return NextResponse.json(
      { error: 'Nombre, apellidos y email son obligatorios' },
      { status: 400 }
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
  }
  if (!planId) {
    return NextResponse.json({ error: 'Elige un plan' }, { status: 400 })
  }

  // --- EL PLAN Y SU PRECIO, DESDE LA BASE DE DATOS ---
  // Cliente normal (anon): la RLS de 'planes' deja leer los activos a
  // cualquiera, así que no hace falta service_role. Y si el plan está
  // desactivado, sencillamente no aparece: no se puede comprar.
  const supabase = await createClient()
  const { data: plan } = await supabase
    .from('planes')
    .select('id, nombre, tipo, especialidad, precio_centimos, activo')
    .eq('id', planId)
    .eq('activo', true)
    .maybeSingle()

  if (!plan) {
    return NextResponse.json(
      { error: 'Ese plan ya no está disponible. Recarga la página.' },
      { status: 400 }
    )
  }
  if (!plan.precio_centimos || plan.precio_centimos < 50) {
    // Stripe no acepta importes por debajo de ~0,50 €
    return NextResponse.json(
      { error: 'Este plan no tiene un precio válido. Avisa a tu preparador.' },
      { status: 400 }
    )
  }

  const importeTotal = plan.precio_centimos * meses

  // Solo se fía del Origin si es este mismo sitio (ver lib/site.ts)
  const origin = origenSeguro(request)

  // Referencia legible que verá el usuario y que el webhook guardará.
  const referencia = generarReferencia()

  // Metadata: todo lo que el webhook necesita para crear la solicitud.
  // Ojo: Stripe limita a 50 claves y 500 caracteres por valor.
  const metadata: Record<string, string> = {
    referencia,
    nombre,
    apellidos,
    email,
    telefono,
    genero,
    username,
    mensaje,
    edad: edadRaw,
    meses: String(meses),
    modalidad: 'pago_unico',
    plan_id: plan.id,
    plan_nombre: plan.nombre.slice(0, 120),
    // Si el plan es de oposición, la especialidad sale de aquí. Si no,
    // el alumno se queda sin oposición, que es un estado válido.
    especialidad: plan.tipo === 'oposicion' && plan.especialidad ? plan.especialidad : '',
    importe_centimos: String(importeTotal),
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: MONEDA,
            product_data: {
              name: `${plan.nombre} — ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
            },
            unit_amount: plan.precio_centimos,
          },
          quantity: meses, // paga N meses de golpe
        },
      ],
      metadata,
      // También en payment_intent para tenerlo asociado al cobro
      payment_intent_data: { metadata },
      success_url: `${origin}/pago/exito?ref=${referencia}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/precios`,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Error creando sesión de Stripe:', e)
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago. Inténtalo de nuevo.' },
      { status: 502 }
    )
  }
}
