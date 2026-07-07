// Renovación ONLINE para una cuenta YA existente (no crea cuenta nueva).
// El alumno logueado paga N meses; el webhook extiende SU suscripción.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, stripeConfigurado, PRECIO_MES_CENTIMOS, MONEDA } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!stripeConfigurado()) {
    return NextResponse.json({ error: 'Pagos no configurados' }, { status: 503 })
  }

  // Debe estar logueado: sabemos quién renueva por su sesión, no por el body
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let meses = 1
  try {
    const body = await request.json()
    meses = Math.min(24, Math.max(1, Math.floor(Number(body?.meses)) || 1))
  } catch {
    // sin body: 1 mes
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellidos, email')
    .eq('id', user.id)
    .single()

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'

  const importe = meses * PRECIO_MES_CENTIMOS

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: MONEDA,
            product_data: {
              name: `Renovación Física Élite — ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
            },
            unit_amount: importe,
          },
          quantity: 1,
        },
      ],
      customer_email: perfil?.email ?? user.email ?? undefined,
      // La clave: marcamos que es RENOVACIÓN y de QUIÉN. El webhook
      // extiende la suscripción de este user_id, sin crear solicitud.
      metadata: {
        tipo: 'renovacion',
        user_id: user.id,
        meses: String(meses),
      },
      success_url: `${origin}/suscripcion?renovado=1`,
      cancel_url: `${origin}/suscripcion?cancelado=1`,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
  }
}
