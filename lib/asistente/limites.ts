// Límites de uso del asistente virtual (ver migración 029 y lib/limites.ts).
//
// SOLO SERVIDOR. Falla CERRADO: si no se puede comprobar el límite (base de
// datos caída, migración sin aplicar), no se atiende la petición. Prefiero un
// asistente que dice "ahora no" a uno sin freno.
import 'server-only'
import { consumirLimite, huellaIp } from '@/lib/limites'

// Por persona: (mensajes/hora, mensajes/día)
const LIMITE_VISITANTE = { hora: 15, dia: 40 }
const LIMITE_ALUMNO = { hora: 40, dia: 120 }
// Tope global de todos juntos, para no agotar la cuota diaria del modelo gratuito
const LIMITE_GLOBAL = { hora: 400, dia: 1500 }

export type ResultadoTurno = 'ok' | 'persona' | 'global' | 'error'

/** Huella de la IP de un visitante sin cuenta (HMAC; ver lib/limites.ts) */
export function huellaVisitante(ip: string): string {
  return huellaIp('ip', ip)
}

export function claveAlumno(userId: string): string {
  return 'u:' + userId
}

export async function consumirTurno(clave: string, esAlumno: boolean): Promise<ResultadoTurno> {
  const limite = esAlumno ? LIMITE_ALUMNO : LIMITE_VISITANTE

  const persona = await consumirLimite(clave, limite.hora, limite.dia)
  if (persona === 'error') return 'error'
  if (persona === 'excedido') return 'persona'

  const global = await consumirLimite('global', LIMITE_GLOBAL.hora, LIMITE_GLOBAL.dia)
  if (global === 'error') return 'error'
  if (global === 'excedido') return 'global'

  return 'ok'
}
