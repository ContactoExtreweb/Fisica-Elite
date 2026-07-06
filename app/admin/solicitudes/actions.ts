'use server'

// Tramitar solicitudes de alta que llegaron por pago web.
// Procesar = crear el usuario real (como el alta manual de la pieza 2) +
// la suscripción con los meses pagados, y marcar la solicitud como hecha.
//
// CLAVE del arreglo de credenciales: estas acciones reciben argumentos
// DIRECTOS (no FormData) y NO hacen revalidatePath de /admin/solicitudes.
// Así el componente cliente no se desmonta al procesar y puede enseñar las
// credenciales en un modal. La lista se refresca al cerrar ese modal.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarPasswordSegura } from '@/lib/password'

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
  username: string,
  nivel: string
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
  const nivelFinal = ['iniciado', 'avanzado', 'profesional'].includes(nivel) ? nivel : 'iniciado'

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
      nivel: nivelFinal,
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
  const inicio = hoyMadrid()
  const meses = Math.min(24, Math.max(1, sol.meses_pagados || 1))
  await supabase.from('suscripciones').insert({
    user_id: nuevoId,
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

export async function rechazarSolicitud(solicitudId: string) {
  const { supabase } = await exigirAdmin()
  if (!solicitudId) return
  await supabase.from('solicitudes_alta').update({ estado: 'rechazada' }).eq('id', solicitudId)
  revalidatePath('/admin/solicitudes')
}
