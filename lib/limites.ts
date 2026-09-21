// Límites de uso por visitante, para los formularios y endpoints públicos.
//
// SOLO SERVIDOR. Reutiliza el contador de la migración 029
// (tabla asistente_uso + función asistente_consumir): el nombre es del
// asistente, pero es genérico. Cada uso lleva su PREFIJO en la clave para que
// no se mezclen los contadores:
//    'ip:'  asistente (visitante)      'u:'  asistente (alumno)
//    'ct:'  formulario de contacto     'ck:' checkout de Stripe
//
// Postgres es el sitio correcto: en Vercel cada petición puede caer en un
// servidor distinto, así que un contador en memoria no serviría.
//
// La IP nunca se guarda en claro: se guarda una huella HMAC con un secreto de
// servidor (la clave de service_role, que ya tiene que existir aquí). Sin ese
// secreto no se puede deshacer probando IPs. Los contadores se borran a los
// 2 días (la propia función y el cron diario).
import 'server-only'
import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/** IP del visitante según Vercel (primera de x-forwarded-for) */
export function ipDe(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'sin-ip'
  )
}

/** Huella no reversible de una IP, con prefijo de uso */
export function huellaIp(prefijo: string, ip: string): string {
  const secreto = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return `${prefijo}:` + createHmac('sha256', secreto).update(ip).digest('hex').slice(0, 32)
}

export type ResultadoLimite = 'ok' | 'excedido' | 'error'

/**
 * Suma 1 al contador de `clave` y dice si sigue dentro de los límites de
 * esta hora y de hoy. 'error' = no se pudo comprobar (base de datos caída,
 * migración sin aplicar): cada llamador decide si eso bloquea o deja pasar.
 */
export async function consumirLimite(
  clave: string,
  porHora: number,
  porDia: number
): Promise<ResultadoLimite> {
  const { data, error } = await createAdminClient().rpc('asistente_consumir', {
    p_clave: clave,
    p_limite_hora: porHora,
    p_limite_dia: porDia,
  })
  if (error || typeof data !== 'boolean') return 'error'
  return data ? 'ok' : 'excedido'
}
