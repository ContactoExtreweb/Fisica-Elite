// Pago ONLINE de un alumno que YA tiene cuenta. Dos casos:
//
//  · modo 'renovar' → alarga UNA suscripción concreta suya, conservando
//                     su plan. Se cobra el precio de ESE plan × meses.
//  · modo 'nuevo'   → contrata un plan que aún no tiene. Acceso al
//                     instante, sin pasar por la aprobación del admin
//                     (ya es alumno: hacerle esperar no aporta nada).
//
// ANTES (el agujero que cierra esto): se cobraba un precio fijo de 39 €
// sin mirar el plan, y el webhook creaba la suscripción SIN plan_id, que
// por compatibilidad v1 significa ACCESO A TODO. Renovar regalaba la
// plataforma entera.
//
// Reglas:
//  · Se sabe QUIÉN paga por la sesión, nunca por el body.
//  · El precio sale SIEMPRE de 'planes' en el servidor. El body solo
//    elige qué y cuántos meses.
//  · La suscripción a renovar tiene que ser del propio alumno.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, stripeConfigurado, MONEDA } from '@/lib/stripe'

export const runtime = 'nodejs'

type Plan = { id: string; nombre: string; precio_centimos: number | null; activo: boolean }

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

export async function POST(request: Request) {
  if (!stripeConfigurado()) {
    return NextResponse.json({ error: 'Pagos no configurados' }, { status: 503 })
  }

  // Debe estar logueado: sabemos quién paga por su sesión, no por el body
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const modo = body.modo === 'nuevo' ? 'nuevo' : 'renovar'
  const meses = Math.min(24, Math.max(1, Math.floor(Number(body.meses)) || 1))

  let plan: Plan | undefined
  let suscripcionId: string | null = null

  if (modo === 'renovar') {
    const subId = String(body.suscripcion_id ?? '').trim()
    if (!subId) return NextResponse.json({ error: 'Falta la suscripción' }, { status: 400 })

    // Doble candado: la RLS ya limita a las suyas, y además filtramos por
    // user_id a mano. Si el id es de otro alumno, simplemente no aparece.
    const { data: sub } = await supabase
      .from('suscripciones')
      .select('id, estado, plan_id, planes(id, nombre, precio_centimos, activo)')
      .eq('id', subId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!sub) return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })

    if (sub.estado === 'cancelada') {
      // Una baja la da el preparador (impago, fin de relación…). Que el
      // alumno la reactive pagando se salta esa decisión: que hable con él.
      return NextResponse.json(
        { error: 'Esta suscripción está dada de baja. Habla con tu preparador para reactivarla.' },
        { status: 400 }
      )
    }
    if (!sub.plan_id) {
      // Suscripción antigua (v1) sin plan: no hay precio que cobrar ni plan
      // que renovar. Tiene que elegir uno.
      return NextResponse.json(
        { error: 'Tu suscripción es antigua y no tiene plan. Elige uno en "Contratar otro plan".' },
        { status: 400 }
      )
    }

    plan = rel(sub.planes) as Plan | undefined
    if (!plan || !plan.activo) {
      // La RLS de 'planes' no devuelve los desactivados: el plan ya no se vende.
      return NextResponse.json(
        { error: 'Este plan ya no está a la venta. Elige otro o habla con tu preparador.' },
        { status: 400 }
      )
    }
    suscripcionId = sub.id as string
  } else {
    const planId = String(body.plan_id ?? '').trim()
    if (!planId) return NextResponse.json({ error: 'Elige un plan' }, { status: 400 })

    const { data } = await supabase
      .from('planes')
      .select('id, nombre, precio_centimos, activo')
      .eq('id', planId)
      .eq('activo', true)
      .maybeSingle()

    plan = (data as Plan | null) ?? undefined
    if (!plan) {
      return NextResponse.json(
        { error: 'Ese plan ya no está disponible. Recarga la página.' },
        { status: 400 }
      )
    }

    // Si ya tuvo este plan y el preparador se lo dio de baja (y no tiene
    // ninguno vivo), no se reabre pagando: misma regla que al renovar. La
    // pantalla ya no lo ofrece; esto corta el POST hecho a mano.
    const { data: filas } = await supabase
      .from('suscripciones')
      .select('estado')
      .eq('user_id', user.id)
      .eq('plan_id', plan.id)
    const estados = (filas ?? []).map((f) => f.estado as string)
    if (estados.length > 0 && estados.every((e) => e === 'cancelada')) {
      return NextResponse.json(
        { error: 'Tu preparador dio de baja este plan. Habla con él para reactivarlo.' },
        { status: 400 }
      )
    }
  }

  if (!plan.precio_centimos || plan.precio_centimos < 50) {
    return NextResponse.json(
      { error: 'Este plan no tiene un precio válido. Avisa a tu preparador.' },
      { status: 400 }
    )
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const origin =
    request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const importe = plan.precio_centimos * meses
  const etiqueta = modo === 'renovar' ? 'Renovación' : 'Nuevo plan'

  // Todo lo que el webhook necesita para dar el acceso. El user_id va aquí
  // y no se puede manipular: la sesión la crea nuestro servidor.
  const metadata: Record<string, string> = {
    tipo: modo === 'renovar' ? 'renovacion' : 'nuevo_plan',
    user_id: user.id,
    plan_id: plan.id,
    suscripcion_id: suscripcionId ?? '',
    meses: String(meses),
    importe_centimos: String(importe),
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: MONEDA,
            product_data: {
              name: `${etiqueta} · ${plan.nombre} — ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
            },
            unit_amount: plan.precio_centimos,
          },
          quantity: meses,
        },
      ],
      customer_email: perfil?.email ?? user.email ?? undefined,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/suscripcion?renovado=1`,
      cancel_url: `${origin}/suscripcion?cancelado=1`,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Error creando sesión de renovación:', e)
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
  }
}
