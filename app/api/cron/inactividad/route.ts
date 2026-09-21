// Tarea diaria: recordatorios por inactividad (ver lib/recordatorios.ts).
//
// La lanza Vercel Cron (vercel.json → "crons") una vez al día. Vercel
// manda la cabecera "Authorization: Bearer <CRON_SECRET>" sola, siempre
// que la variable CRON_SECRET exista en el proyecto.
//
// SEGURIDAD: este endpoint MANDA CORREOS con la clave de service_role.
//  · Sin CRON_SECRET configurado → cerrado para todo el mundo (401).
//  · La comparación del secreto es de tiempo constante.
//  · Está en RUTAS_PUBLICAS del proxy solo para que el proxy no lo mande
//    a /login (la petición de Vercel no trae cookie de sesión): la
//    protección es el secreto, aquí.
//
// Para probar a mano:  GET /api/cron/inactividad?simular=1  con la misma
// cabecera → devuelve a quién se avisaría, sin mandar nada.
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ejecutarRecordatorios } from '@/lib/recordatorios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false
  const esperado = Buffer.from(`Bearer ${secreto}`)
  const recibido = Buffer.from(request.headers.get('authorization') ?? '')
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado)
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const simular = new URL(request.url).searchParams.get('simular') === '1'
  try {
    const supabase = createAdminClient()

    // Aprovecha la tarea diaria para vaciar los contadores del asistente
    // virtual con más de 2 días (migración 029): así no se guarda ni siquiera
    // la huella anónima de un visitante más allá de eso. Si falla (p. ej. la
    // migración aún no está aplicada), se ignora: no debe frenar los avisos.
    if (!simular) {
      const limite = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)
      await supabase.from('asistente_uso').delete().lt('ventana', limite)
    }

    const resumen = await ejecutarRecordatorios(supabase, { simular })
    console.log(
      '[cron inactividad]',
      JSON.stringify({ ...resumen, destinatarios: resumen.destinatarios.length })
    )
    return NextResponse.json(resumen)
  } catch (e) {
    console.error('[cron inactividad] error', e)
    return NextResponse.json({ error: 'Error ejecutando los recordatorios' }, { status: 500 })
  }
}
