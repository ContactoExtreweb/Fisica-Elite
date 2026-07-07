// Webhook de Stripe — el punto MÁS delicado de la pasarela.
//
// Reglas de oro (todas aplicadas aquí):
//  1. Leer el cuerpo con req.text() (crudo). Si se parsea como JSON antes,
//     la verificación de firma falla SIEMPRE.
//  2. Verificar la firma con constructEvent: rechaza eventos falsos.
//  3. Idempotencia: Stripe puede reenviar el mismo evento; guardamos su id
//     y no lo procesamos dos veces.
//  4. Runtime de Node (el SDK de Stripe no va en Edge).
//  5. Dar el acceso SOLO desde aquí (webhook), nunca desde la redirección
//     del navegador: el usuario puede cerrar la pestaña y el pago igual
//     se confirma por esta vía.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ESPECIALIDADES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
]

export async function POST(request: Request) {
  const body = await request.text() // CRUDO, imprescindible
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Sin firma' }, { status: 400 })
  }

  // 1 · Verificar que el evento viene de Stripe y no está manipulado
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'desconocido'
    return NextResponse.json({ error: `Firma inválida: ${msg}` }, { status: 400 })
  }

  const admin = createAdminClient()

  // 2 · Idempotencia: ¿ya procesamos este evento?
  const { error: dupError } = await admin
    .from('stripe_eventos')
    .insert({ id: event.id, tipo: event.type })

  if (dupError) {
    // Clave duplicada => ya lo procesamos. Respondemos 200 para que
    // Stripe no siga reintentando.
    if (dupError.code === '23505') {
      return NextResponse.json({ received: true, duplicado: true })
    }
    // Otro error de BBDD: devolvemos 500 para que Stripe reintente
    console.error('Error registrando evento Stripe:', dupError)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  // 3 · Procesar el evento que nos interesa
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Solo si el pago está realmente cobrado
      const pagado =
        session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required'

      if (pagado) {
        const m = session.metadata ?? {}
        if (m.tipo === 'renovacion' && m.user_id) {
          // Cuenta existente que renueva online: extendemos SU suscripción.
          await renovarSuscripcionDesdeSesion(admin, session)
        } else {
          // Alta nueva: creamos la solicitud para que un admin la tramite.
          await crearSolicitudDesdeSesion(admin, session)
        }
      }
    }
    // (En fase 2, aquí manejaríamos invoice.paid para renovaciones de
    //  suscripción, customer.subscription.deleted para bajas, etc.)
  } catch (e) {
    console.error('Error procesando evento:', e)
    // 500 => Stripe reintenta. Como ya guardamos el id, para no bloquear
    // el reintento borramos el registro de idempotencia en caso de fallo.
    await admin.from('stripe_eventos').delete().eq('id', event.id)
    return NextResponse.json({ error: 'Error procesando' }, { status: 500 })
  }

  // 4 · Responder rápido con 2xx
  return NextResponse.json({ received: true })
}

// Crea la SOLICITUD DE ALTA pendiente a partir de la sesión pagada.
// No crea el usuario: eso lo hace un admin desde el panel.
async function crearSolicitudDesdeSesion(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const m = session.metadata ?? {}

  const especialidad = ESPECIALIDADES.includes(String(m.especialidad))
    ? String(m.especialidad)
    : null

  const edadNum = Number(m.edad)
  const edad = Number.isInteger(edadNum) && edadNum >= 14 && edadNum <= 100 ? edadNum : null

  await admin.from('solicitudes_alta').insert({
    nombre: m.nombre || null,
    apellidos: m.apellidos || null,
    genero: m.genero || null,
    edad,
    especialidad,
    username_solicitado: m.username || null,
    email: (m.email || session.customer_email || '').toLowerCase() || null,
    telefono: m.telefono || null,
    meses_pagados: Math.min(24, Math.max(1, Number(m.meses) || 1)),
    modalidad: m.modalidad || 'pago_unico',
    referencia: m.referencia || null,
    nivel_solicitado: m.nivel || 'iniciado',
    mensaje_usuario: m.mensaje || null,
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    stripe_customer:
      typeof session.customer === 'string' ? session.customer : null,
    estado: 'pendiente',
  })
}


// --- Renovación online de una cuenta existente ---------------------
function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, mo, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1 + meses, d)).toISOString().slice(0, 10)
}

// Extiende (o reactiva) la suscripción del usuario indicado en la sesión.
// Si tiene acceso vigente, suma desde su fecha de fin; si no, desde hoy.
async function renovarSuscripcionDesdeSesion(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const m = session.metadata ?? {}
  const userId = String(m.user_id)
  const meses = Math.min(24, Math.max(1, Number(m.meses) || 1))
  const hoy = hoyMadrid()

  const { data: actual } = await admin
    .from('suscripciones')
    .select('fecha_fin')
    .eq('user_id', userId)
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)
    .order('fecha_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  const base = actual?.fecha_fin && actual.fecha_fin >= hoy ? actual.fecha_fin : hoy

  await admin.from('suscripciones').insert({
    user_id: userId,
    metodo: 'tarjeta',
    meses,
    fecha_inicio: base,
    fecha_fin: sumarMeses(base, meses),
    estado: 'activa',
    stripe_payment_intent:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    notas: 'Renovación online (Stripe)',
  })
}
