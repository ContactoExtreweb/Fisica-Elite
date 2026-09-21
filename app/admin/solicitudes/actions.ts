'use server'

// Tramitar solicitudes de alta que llegaron por pago web.
// Procesar = crear el usuario real (como el alta manual de la pieza 2) +
// la suscripción con los meses pagados, y marcar la solicitud como hecha.
//
// CLAVE del arreglo de credenciales: estas acciones reciben argumentos
// DIRECTOS (no FormData) y NO hacen revalidatePath de /admin/solicitudes.
// Así el componente cliente no se desmonta al procesar y puede enseñar las
// credenciales en un modal. La lista se refresca al cerrar ese modal.
//
// v2: fuera 'nivel'. La 014 tiró profiles.nivel, pero aquí se seguía
// escribiendo: el update fallaba, entraba el rollback y BORRABA el usuario
// recién creado en Auth. Resultado: ninguna solicitud de pago web se podía
// tramitar. El tramo del alumno lo asigna ahora el cuestionario inicial.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarPasswordSegura } from '@/lib/password'
import { stripe, stripeConfigurado } from '@/lib/stripe'

export type Credenciales = { email: string; username: string; password: string }
export type ResultadoProceso =
  | { ok: true; credenciales: Credenciales }
  | { ok: false; error: string }

function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + meses, d)).toISOString().slice(0, 10)
}

export async function procesarSolicitud(
  solicitudId: string,
  username: string
): Promise<ResultadoProceso> {
  const { supabase, user: admin } = await exigirAdmin()
  if (!solicitudId) return { ok: false, error: 'Falta la solicitud' }

  // 1 · Cargar la solicitud (RLS: solo admins la leen)
  const { data: sol } = await supabase
    .from('solicitudes_alta')
    .select('*')
    .eq('id', solicitudId)
    .single()

  if (!sol) return { ok: false, error: 'Solicitud no encontrada' }
  if (sol.estado !== 'pendiente') return { ok: false, error: 'Esta solicitud ya fue tramitada' }
  if (!sol.email) return { ok: false, error: 'La solicitud no tiene email' }

  const nombreUsuario = (username || sol.username_solicitado || '').trim()

  // 2 · Crear el usuario en Auth (service_role, como en el alta manual)
  const adminClient = createAdminClient()
  const password = generarPasswordSegura()

  const { data: creado, error: errAuth } = await adminClient.auth.admin.createUser({
    email: sol.email,
    password,
    email_confirm: true,
  })

  if (errAuth || !creado?.user) {
    const yaExiste =
      errAuth?.message?.toLowerCase().includes('already') || errAuth?.code === 'email_exists'
    return {
      ok: false,
      error: yaExiste ? 'Ya existe un usuario con ese email' : 'No se pudo crear el usuario',
    }
  }

  const nuevoId = creado.user.id

  // 3 · Completar el perfil
  const { error: errPerfil } = await supabase
    .from('profiles')
    .update({
      nombre: sol.nombre,
      apellidos: sol.apellidos,
      genero: sol.genero,
      edad: sol.edad,
      especialidad: sol.especialidad,
      username: nombreUsuario || null,
      telefono: sol.telefono,
      email: sol.email,
      created_by: admin.id,
      must_change_password: true,
    })
    .eq('id', nuevoId)

  if (errPerfil) {
    await adminClient.auth.admin.deleteUser(nuevoId) // rollback
    if (errPerfil.code === '23505') return { ok: false, error: 'Ese nombre de usuario ya está en uso' }
    return { ok: false, error: 'No se pudo guardar el perfil. No se ha creado el alumno.' }
  }

  // 4 · Suscripción con los meses pagados (método tarjeta)
  //
  // CLAVE: va con su plan_id. Una suscripción sin plan significa, por
  // compatibilidad con la v1, ACCESO A TODO; si no lo copiamos aquí,
  // quien pagó el plan de 15 € se lleva la plataforma entera.
  const inicio = hoyMadrid()
  const meses = Math.min(24, Math.max(1, sol.meses_pagados || 1))
  await supabase.from('suscripciones').insert({
    user_id: nuevoId,
    plan_id: sol.plan_id ?? null,
    metodo: 'tarjeta',
    meses,
    fecha_inicio: inicio,
    fecha_fin: sumarMeses(inicio, meses),
    estado: 'activa',
    marcado_por: admin.id,
    stripe_payment_intent: sol.stripe_payment_intent,
    notas: `Alta desde pago web (ref ${sol.referencia ?? '—'})`,
  })

  // 5 · Marcar la solicitud como procesada y enlazar el perfil
  await supabase
    .from('solicitudes_alta')
    .update({ estado: 'procesada', procesado_por: admin.id, profile_creado: nuevoId })
    .eq('id', solicitudId)

  // NO hacemos revalidatePath aquí: cualquier revalidación fuerza a Next a
  // recargar la página actual, lo que cerraría el modal de credenciales antes
  // de que se lea. La lista (y el badge) se refrescan en el cliente al cerrar
  // el modal con router.refresh().

  return {
    ok: true,
    credenciales: { email: sol.email, username: nombreUsuario || sol.email, password },
  }
}

/**
 * Rechaza la solicitud Y DEVUELVE el pago por Stripe. Es la versión con dinero
 * de rechazarSolicitud, y solo la dispara el admin con su botón y una
 * confirmación explícita.
 *
 *  · Devuelve el importe COMPLETO del pago (Stripe no reintegra su comisión).
 *  · La devolución lleva clave de idempotencia por solicitud: si algo falla a
 *    medias y el admin vuelve a pulsar, Stripe devuelve la MISMA devolución en
 *    vez de crear otra. Nunca se devuelve dos veces.
 *  · Orden: primero el dinero, después el estado. Si Stripe falla, la
 *    solicitud NO se toca. Si el dinero sale pero el estado no se guarda, el
 *    mensaje lo dice y basta volver a pulsar.
 */
export async function rechazarYReembolsar(
  solicitudId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await exigirAdmin()
  if (!solicitudId) return { ok: false, error: 'Falta la solicitud' }

  const { data: sol } = await supabase
    .from('solicitudes_alta')
    .select('id, estado, stripe_payment_intent')
    .eq('id', solicitudId)
    .single()

  if (!sol) return { ok: false, error: 'Solicitud no encontrada' }
  if (sol.estado !== 'pendiente') return { ok: false, error: 'Esta solicitud ya fue tramitada' }
  if (!sol.stripe_payment_intent) {
    return {
      ok: false,
      error:
        'Esta solicitud no tiene un pago de Stripe asociado. Si hay que devolver dinero, hazlo a mano desde el panel de Stripe.',
    }
  }
  if (!stripeConfigurado()) return { ok: false, error: 'Stripe no está configurado' }

  let reembolsoId: string | null = null
  try {
    const devolucion = await stripe.refunds.create(
      {
        payment_intent: sol.stripe_payment_intent as string,
        reason: 'requested_by_customer',
        metadata: { solicitud_id: sol.id },
      },
      { idempotencyKey: `reembolso-solicitud-${sol.id}` }
    )
    reembolsoId = devolucion.id
  } catch (e) {
    // Ya devuelto antes (a mano en Stripe, o un intento anterior): el dinero
    // ya está en su sitio, así que solo falta marcar la solicitud.
    const codigo = (e as { code?: string }).code
    if (codigo !== 'charge_already_refunded') {
      console.error('[reembolso]', e instanceof Error ? e.message : e)
      return {
        ok: false,
        error:
          'Stripe no ha podido devolver el pago. No ha cambiado nada: puedes reintentarlo o devolverlo a mano desde el panel de Stripe.',
      }
    }
  }

  const { error } = await supabase
    .from('solicitudes_alta')
    .update({ estado: 'rechazada' })
    .eq('id', sol.id)
  if (error) {
    return {
      ok: false,
      error:
        'El pago SÍ se ha devuelto, pero no se pudo marcar la solicitud como rechazada. Vuelve a pulsar el botón: no se devolverá dos veces.',
    }
  }

  // Traza de la devolución (migración 030). Si esa migración aún no está
  // aplicada, falla en silencio: el dinero ya está devuelto y la solicitud
  // marcada, que es lo importante.
  if (reembolsoId) {
    await supabase
      .from('solicitudes_alta')
      .update({ reembolso_id: reembolsoId, reembolsado_at: new Date().toISOString() })
      .eq('id', sol.id)
  }

  revalidatePath('/admin/solicitudes')
  return { ok: true }
}

export async function rechazarSolicitud(solicitudId: string) {
  const { supabase } = await exigirAdmin()
  if (!solicitudId) return
  await supabase.from('solicitudes_alta').update({ estado: 'rechazada' }).eq('id', solicitudId)
  revalidatePath('/admin/solicitudes')
}
