// Límites de uso del asistente virtual (ver migración 029).
//
// SOLO SERVIDOR. Usa el cliente admin (service_role) porque la tabla de
// contadores no tiene políticas RLS: es lo único que puede tocarla, y solo
// a través de la función `asistente_consumir`.
//
// Falla CERRADO: si no se puede comprobar el límite (base de datos caída,
// migración sin aplicar), no se atiende la petición. Prefiero un asistente
// que dice "ahora no" a uno sin freno.
import 'server-only'
import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Por persona: (mensajes/hora, mensajes/día)
const LIMITE_VISITANTE = { hora: 15, dia: 40 }
const LIMITE_ALUMNO = { hora: 40, dia: 120 }
// Tope global de todos juntos, para no agotar la cuota diaria del modelo gratuito
const LIMITE_GLOBAL = { hora: 400, dia: 1500 }

export type ResultadoLimite = 'ok' | 'persona' | 'global' | 'error'

/**
 * Huella de la IP del visitante. HMAC con la clave del proveedor: la IP en
 * claro no se guarda en ningún sitio, y sin la clave no se puede deshacer
 * (un hash simple de una IP se rompe probando las 4.000 millones de IPv4).
 */
export function huellaVisitante(ip: string): string {
  const clave = process.env.ASISTENTE_API_KEY ?? ''
  return 'ip:' + createHmac('sha256', clave).update(ip).digest('hex').slice(0, 32)
}

export function claveAlumno(userId: string): string {
  return 'u:' + userId
}

export async function consumirTurno(
  clave: string,
  esAlumno: boolean
): Promise<ResultadoLimite> {
  const supabase = createAdminClient()
  const limite = esAlumno ? LIMITE_ALUMNO : LIMITE_VISITANTE

  const persona = await supabase.rpc('asistente_consumir', {
    p_clave: clave,
    p_limite_hora: limite.hora,
    p_limite_dia: limite.dia,
  })
  if (persona.error || typeof persona.data !== 'boolean') return 'error'
  if (!persona.data) return 'persona'

  const global = await supabase.rpc('asistente_consumir', {
    p_clave: 'global',
    p_limite_hora: LIMITE_GLOBAL.hora,
    p_limite_dia: LIMITE_GLOBAL.dia,
  })
  if (global.error || typeof global.data !== 'boolean') return 'error'
  if (!global.data) return 'global'

  return 'ok'
}
