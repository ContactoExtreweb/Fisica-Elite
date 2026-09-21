// Recordatorios por inactividad — SOLO servidor.
//
// Busca alumnos con plan online activo que llevan DIAS_INACTIVIDAD días o
// más sin entrar y les manda UN correo por racha (ver lib/actividad.ts).
//
// Lo llaman dos sitios:
//   · la tarea diaria de Vercel (/api/cron/inactividad), con el cliente
//     de service_role porque no hay sesión;
//   · el botón "Enviar ahora" del admin, con SU cliente normal: la RLS ya
//     le deja leer y actualizar todos los perfiles, no hace falta más.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  enviarEmail,
  emailConfigurado,
  emailModoPruebas,
  escaparHtml,
  urlBase,
  type ResultadoEmail,
} from '@/lib/email'
import { LOGO_ADJUNTO, LOGO_CID } from '@/lib/email-logo'
import { DIAS_INACTIVIDAD, diasDesde, pendienteDeAviso } from '@/lib/actividad'
import { hoyMadrid, sumarDias } from '@/lib/evaluaciones'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>

// Resend admite ~2 envíos por segundo. Con el tope, una ejecución dura
// menos de 20 s; si hubiera más pendientes, salen al día siguiente.
const MAX_POR_EJECUCION = 25
const PAUSA_MS = 550

type Plan = { nombre: string }
type Sub = { estado: string; fecha_fin: string; planes: Plan | Plan[] | null }
type Fila = {
  id: string
  nombre: string | null
  email: string | null
  ultima_actividad: string | null
  aviso_inactividad_at: string | null
  recordatorios_email: boolean
  suscripciones: Sub[] | null
}

export type Candidato = {
  id: string
  nombre: string
  email: string
  dias: number
  planes: string[]
  hasta: string // fecha_fin más lejana de sus planes vigentes
}

export type ResumenRecordatorios = {
  configurado: boolean
  modoPruebas: string | null
  simulado: boolean
  pendientes: number
  enviados: number
  quedan: number // pendientes que no entraron por el tope de esta ejecución
  errores: { email: string; error: string }[]
  destinatarios: { nombre: string; email: string; dias: number }[]
}

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

export async function candidatosRecordatorio(supabase: SB): Promise<Candidato[]> {
  const hoy = hoyMadrid()
  const ahora = Date.now()
  const limite = new Date(ahora - DIAS_INACTIVIDAD * 86_400_000).toISOString()

  // Filtro grueso en la BBDD; el fino, en pendienteDeAviso (una sola regla)
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, nombre, email, ultima_actividad, aviso_inactividad_at, recordatorios_email, suscripciones(estado, fecha_fin, planes(nombre))'
    )
    .eq('rol', 'alumno')
    .eq('recordatorios_email', true)
    .lt('ultima_actividad', limite)
    .order('ultima_actividad', { ascending: true })
  if (error) throw new Error(`No se pudieron leer los alumnos: ${error.message}`)

  const out: Candidato[] = []
  for (const p of (data ?? []) as Fila[]) {
    const vigentes = (p.suscripciones ?? []).filter((s) => s.estado === 'activa' && s.fecha_fin >= hoy)
    if (!p.email || !pendienteDeAviso({ ...p, tieneAccesoOnline: vigentes.length > 0 }, ahora)) {
      continue
    }
    out.push({
      id: p.id,
      nombre: (p.nombre ?? '').trim().split(' ')[0],
      email: p.email,
      dias: diasDesde(p.ultima_actividad, ahora) ?? DIAS_INACTIVIDAD,
      planes: vigentes.map((s) => rel(s.planes)?.nombre).filter((n): n is string => !!n),
      hasta: vigentes.map((s) => s.fecha_fin).sort().at(-1) ?? hoy,
    })
  }
  return out
}

export async function ejecutarRecordatorios(
  supabase: SB,
  { simular = false }: { simular?: boolean } = {}
): Promise<ResumenRecordatorios> {
  const candidatos = await candidatosRecordatorio(supabase)
  const lote = candidatos.slice(0, MAX_POR_EJECUCION)
  const resumen: ResumenRecordatorios = {
    configurado: emailConfigurado(),
    modoPruebas: emailModoPruebas(),
    simulado: simular,
    pendientes: candidatos.length,
    enviados: 0,
    quedan: candidatos.length - lote.length,
    errores: [],
    destinatarios: lote.map((c) => ({ nombre: c.nombre, email: c.email, dias: c.dias })),
  }
  if (simular || !resumen.configurado) return resumen

  const base = urlBase()
  for (const [i, c] of lote.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_MS))
    const res = await enviarEmail({
      para: c.email,
      ...correoInactividad(c, base),
      adjuntos: [LOGO_ADJUNTO],
    })
    if (!res.ok) {
      // No se marca: se reintenta mañana
      resumen.errores.push({ email: c.email, error: res.error })
      continue
    }
    // Se marca JUSTO después de cada envío: si la ejecución se corta a
    // medias, los ya avisados no reciben un segundo correo.
    await supabase
      .from('profiles')
      .update({ aviso_inactividad_at: new Date().toISOString() })
      .eq('id', c.id)
    resumen.enviados++
  }
  return resumen
}

/**
 * Manda el correo de inactividad con datos de ejemplo, para ver cómo
 * queda sin tener que dejar a un alumno 7 días sin entrar. Devuelve a
 * dónde llegó de verdad (en modo pruebas, a EMAIL_PRUEBAS_A).
 */
export async function enviarEjemploInactividad(
  para: string
): Promise<ResultadoEmail & { destino: string }> {
  const c = correoInactividad(
    { nombre: 'Antonio', dias: 9, planes: ['Plan Dominadas'], hasta: sumarDias(hoyMadrid(), 30) },
    urlBase()
  )
  const res = await enviarEmail({
    para,
    asunto: `[Ejemplo] ${c.asunto}`,
    html: c.html,
    texto: c.texto,
    adjuntos: [LOGO_ADJUNTO],
  })
  return { ...res, destino: emailModoPruebas() ?? para }
}

// ---------------------------------------------------------------------
//  El correo
// ---------------------------------------------------------------------

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

function frasePlan(planes: string[], hasta: string): string {
  const fecha = fmtFecha(hasta)
  if (planes.length === 0) return `Tu plan sigue activo hasta el ${fecha}`
  if (planes.length === 1) return `Tu plan «${planes[0]}» sigue activo hasta el ${fecha}`
  const lista = `${planes
    .slice(0, -1)
    .map((p) => `«${p}»`)
    .join(', ')} y «${planes.at(-1)}»`
  return `Tus planes ${lista} siguen activos hasta el ${fecha}`
}

export function correoInactividad(
  c: Pick<Candidato, 'nombre' | 'dias' | 'planes' | 'hasta'>,
  base: string
): { asunto: string; html: string; texto: string } {
  const saludo = c.nombre ? `Hola, ${c.nombre}` : 'Hola'
  const asunto = c.nombre
    ? `${c.nombre}, tu entrenamiento te está esperando`
    : 'Tu entrenamiento te está esperando'
  const plan = frasePlan(c.planes, c.hasta)
  const urlInicio = `${base}/inicio`
  const urlPerfil = `${base}/perfil`

  const texto = [
    `${saludo}:`,
    '',
    `Hace ${c.dias} días que no entras en Físicas Élite. ${plan}, así que tienes todo tu entrenamiento esperándote justo donde lo dejaste.`,
    '',
    'La constancia es lo que marca la diferencia el día de la prueba. Aunque hoy solo tengas tiempo para una sesión corta, cuenta.',
    '',
    `Volver a entrenar: ${urlInicio}`,
    '',
    'Si te ha surgido algo o tienes dudas con el plan, escríbele a tu preparador por el chat de la plataforma.',
    '',
    '—',
    `Te mandamos este aviso porque tienes un plan activo y llevas más de ${DIAS_INACTIVIDAD} días sin entrar. Puedes desactivar estos recordatorios desde tu perfil: ${urlPerfil}`,
  ].join('\n')

  // HTML de correo: tablas y estilos en línea (Gmail y Outlook ignoran
  // <style> y flexbox). Colores de la marca: negro verdoso, ocre, hueso.
  const e = escaparHtml
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(asunto)}</title></head>
<body style="margin:0;padding:0;background:#F2EFE8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFE8;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFF0;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#030E0A;">
<tr><td align="center" style="padding:30px 28px 16px;"><img src="cid:${LOGO_CID}" width="93" height="110" alt="Físicas Élite" style="display:block;border:0;outline:none;width:93px;height:110px;"></td></tr>
<tr><td align="center" style="padding:0 0 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="48" height="3" style="background:#C09D39;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:22px 28px 8px;font-size:22px;font-weight:700;line-height:1.3;">${e(saludo)}</td></tr>
<tr><td style="padding:8px 28px;font-size:15px;line-height:1.6;color:#23302A;">Hace <strong>${c.dias} días</strong> que no entras en Físicas Élite. ${e(plan)}, así que tienes todo tu entrenamiento esperándote justo donde lo dejaste.</td></tr>
<tr><td style="padding:8px 28px 4px;font-size:15px;line-height:1.6;color:#23302A;">La constancia es lo que marca la diferencia el día de la prueba. Aunque hoy solo tengas tiempo para una sesión corta, cuenta.</td></tr>
<tr><td style="padding:22px 28px 8px;"><a href="${e(urlInicio)}" style="display:inline-block;background:#030E0A;color:#FFFFF0;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:100px;">Volver a entrenar</a></td></tr>
<tr><td style="padding:14px 28px 28px;font-size:14px;line-height:1.6;color:#58635C;">Si te ha surgido algo o tienes dudas con el plan, escríbele a tu preparador por el chat de la plataforma.</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid #DED9C0;font-size:12px;line-height:1.5;color:#8A948D;">Te mandamos este aviso porque tienes un plan activo y llevas más de ${DIAS_INACTIVIDAD} días sin entrar. Puedes <a href="${e(urlPerfil)}" style="color:#7A5F1E;">desactivar estos recordatorios desde tu perfil</a>.</td></tr>
</table>
</td></tr>
</table>
</body></html>`

  return { asunto, html, texto }
}
