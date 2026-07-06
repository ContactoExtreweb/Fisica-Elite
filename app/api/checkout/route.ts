// Crea una sesión de Stripe Checkout para el pago desde la web pública.
//
// Flujo Física Élite: quien paga NO se registra solo. Metemos sus datos
// del formulario en la metadata de la sesión; cuando el pago se confirme,
// el WEBHOOK creará una "solicitud de alta pendiente" que un admin tramita.
//
// Soporta las dos modalidades (pago único / suscripción). En esta fase
// cableamos el pago único; la suscripción queda preparada.
import { NextResponse } from 'next/server'
import { stripe, PRECIO_MES_CENTIMOS, MONEDA } from '@/lib/stripe'
import { generarReferencia } from '@/lib/referencia'

// Node runtime (el SDK de Stripe lo necesita; Edge no vale)
export const runtime = 'nodejs'

const ESPECIALIDADES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
] as const

export async function POST(request: Request) {
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

  // --- Datos del solicitante (validación en servidor) ---
  const nombre = texto('nombre')
  const apellidos = texto('apellidos')
  const email = texto('email').toLowerCase()
  const telefono = texto('telefono')
  const genero = texto('genero')
  const especialidad = texto('especialidad')
  const username = texto('username')
  const nivelRaw = texto('nivel')
  const nivel = ['iniciado', 'avanzado', 'profesional'].includes(nivelRaw) ? nivelRaw : 'iniciado'
  const mensaje = texto('mensaje').slice(0, 480) // Stripe limita metadata a 500 chars/valor
  const edadRaw = texto('edad')
  const modalidad = texto('modalidad') === 'suscripcion' ? 'suscripcion' : 'pago_unico'
  const meses = Math.min(24, Math.max(1, Number(body['meses']) || 1))

  if (!nombre || !apellidos || !email || !especialidad) {
    return NextResponse.json(
      { error: 'Nombre, apellidos, email y especialidad son obligatorios' },
      { status: 400 }
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
  }
  if (!(ESPECIALIDADES as readonly string[]).includes(especialidad)) {
    return NextResponse.json({ error: 'Especialidad no válida' }, { status: 400 })
  }

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'

  // Referencia legible que verá el usuario y que el webhook guardará.
  const referencia = generarReferencia()

  // Metadata: todo lo que el webhook necesita para crear la solicitud.
  const metadata: Record<string, string> = {
    referencia,
    nombre,
    apellidos,
    email,
    telefono,
    genero,
    especialidad,
    username,
    nivel,
    mensaje,
    edad: edadRaw,
    meses: String(meses),
    modalidad,
  }

  try {
    if (modalidad === 'suscripcion') {
      // --- SUSCRIPCIÓN RECURRENTE (preparada, se activa en fase 2) ---
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: MONEDA,
              product_data: { name: 'Física Élite — Suscripción mensual' },
              unit_amount: PRECIO_MES_CENTIMOS,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        // La metadata en suscripción va mejor en subscription_data para
        // que viaje también a las facturas de renovación.
        subscription_data: { metadata },
        metadata,
        success_url: `${origin}/pago/exito?ref=${referencia}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/precios`,
      })
      return NextResponse.json({ url: session.url })
    }

    // --- PAGO ÚNICO POR MESES (cableado en esta fase) ---
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: MONEDA,
            product_data: {
              name: `Física Élite — Acceso ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
            },
            unit_amount: PRECIO_MES_CENTIMOS,
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
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Error creando sesión de Stripe:', e)
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago. Inténtalo de nuevo.' },
      { status: 502 }
    )
  }
}
