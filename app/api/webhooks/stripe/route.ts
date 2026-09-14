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
//  6. Si guardar en BBDD falla, LANZAR el error: el catch borra el registro
//     de idempotencia y responde 500, y Stripe reintenta. Tragarse el error
//     deja el pago cobrado y el acceso sin dar, en silencio.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { esOposicionValida } from '@/lib/oposiciones'

export const runtime = 'nodejs'

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
        if ((m.tipo === 'renovacion' || m.tipo === 'nuevo_plan') && m.user_id) {
          // Alumno con cuenta que renueva un plan o contrata otro desde
          // /suscripcion: acceso al instante, sin solicitud.
          await pagoDeAlumnoDesdeSesion(admin, session)
        } else {
          // Alta nueva: creamos la solicitud para que un admin la tramite.
          await crearSolicitudDesdeSesion(admin, session)
        }
      }
    }
    // (Si algún día hay cobro recurrente, aquí irían invoice.paid,
    //  customer.subscription.deleted, etc.)
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

  // La oposición viene del PLAN (si es de tipo 'oposicion'); vacía es un
  // estado válido: hay alumnos que solo entrenan categorías sueltas.
  const especialidad = esOposicionValida(String(m.especialidad ?? ''))
    ? String(m.especialidad)
    : null

  const edadNum = Number(m.edad)
  const edad = Number.isInteger(edadNum) && edadNum >= 14 && edadNum <= 100 ? edadNum : null

  // El plan comprado y lo que pagó de verdad (migración 017). Sin esto,
  // al tramitar el alta la suscripción salía sin plan = acceso a todo.
  const importeNum = Number(m.importe_centimos)
  const importe = Number.isFinite(importeNum) && importeNum > 0 ? Math.round(importeNum) : null

  const { error } = await admin.from('solicitudes_alta').insert({
    plan_id: m.plan_id || null,
    importe_centimos: importe,
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
    mensaje_usuario: m.mensaje || null,
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    stripe_customer:
      typeof session.customer === 'string' ? session.customer : null,
    estado: 'pendiente',
  })

  // Antes este error se ignoraba: si el insert fallaba, el pago quedaba
  // cobrado, el evento marcado como procesado y la solicitud perdida.
  if (error) throw error
}


// --- Pagos de alumnos que ya tienen cuenta ------------------------
function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, mo, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1 + meses, d)).toISOString().slice(0, 10)
}

// Renovar un plan o contratar otro desde /suscripcion. Acceso al instante.
//
// UNA fila de 'suscripciones' por plan: si el alumno ya tiene ese plan
// (vigente o caducado) se ALARGA esa misma fila —igual que hace el admin
// desde la ficha—; si no, se crea. Así nunca quedan dos filas vivas del
// mismo plan, y la suscripción siempre lleva su plan_id.
//
// ANTES: se insertaba una fila SIN plan_id, que por compatibilidad v1
// significa acceso a todo. Renovar regalaba la plataforma entera.
async function pagoDeAlumnoDesdeSesion(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const m = session.metadata ?? {}
  const userId = String(m.user_id)
  const planId = m.plan_id || null
  const meses = Math.min(24, Math.max(1, Number(m.meses) || 1))
  const hoy = hoyMadrid()
  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : null

  // Compatibilidad: sesiones creadas con el código ANTERIOR a este cambio
  // (sin plan_id) que se paguen ya desplegado esto. Stripe caduca las
  // sesiones de Checkout a las 24 h, así que solo cubre ese margen: se
  // pagaron con las reglas viejas y se les da lo que se les vendió.
  if (!planId) {
    const { error } = await admin.from('suscripciones').insert({
      user_id: userId,
      metodo: 'tarjeta',
      meses,
      fecha_inicio: hoy,
      fecha_fin: sumarMeses(hoy, meses),
      estado: 'activa',
      stripe_payment_intent: paymentIntent,
      notas: 'Renovación online (Stripe, sesión antigua sin plan)',
    })
    if (error) throw error
    return
  }

  type Fila = { id: string; fecha_fin: string | null; meses: number | null }
  let fila: Fila | null = null

  // ¿Qué fila alargamos? Primero la que eligió en /suscripcion; si no viene
  // (contratar plan nuevo), la que ya tenga de ese plan sin dar de baja.
  // SIEMPRE filtrando por user_id: el admin client se salta la RLS, así que
  // este filtro es lo único que impide tocar la suscripción de otro.
  if (m.suscripcion_id) {
    const { data } = await admin
      .from('suscripciones')
      .select('id, fecha_fin, meses')
      .eq('id', m.suscripcion_id)
      .eq('user_id', userId)
      .maybeSingle()
    fila = (data as Fila | null) ?? null
  }

  if (!fila) {
    const { data } = await admin
      .from('suscripciones')
      .select('id, fecha_fin, meses')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .neq('estado', 'cancelada')
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle()
    fila = (data as Fila | null) ?? null
  }

  if (fila) {
    // Si sigue vigente, se suma desde su fin; si ya caducó, desde hoy.
    const desde = (fila.fecha_fin ?? '') > hoy ? (fila.fecha_fin as string) : hoy
    const { error } = await admin
      .from('suscripciones')
      .update({
        fecha_fin: sumarMeses(desde, meses),
        meses: (fila.meses ?? 0) + meses,
        estado: 'activa',
        stripe_payment_intent: paymentIntent,
      })
      .eq('id', fila.id)
    if (error) throw error
    return
  }

  const { error } = await admin.from('suscripciones').insert({
    user_id: userId,
    plan_id: planId,
    metodo: 'tarjeta',
    meses,
    fecha_inicio: hoy,
    fecha_fin: sumarMeses(hoy, meses),
    estado: 'activa',
    stripe_payment_intent: paymentIntent,
    notas: 'Contratado online por el alumno (Stripe)',
  })
  if (error) throw error
}
