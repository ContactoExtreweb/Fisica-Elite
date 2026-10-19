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
  htmlCorreo,
  urlBase,
  type ResultadoEmail,
} from '@/lib/email'
import { LOGO_ADJUNTO } from '@/lib/email-logo'
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

  // El diseño del correo es común a todos: lib/email.ts → htmlCorreo.
  const e = escaparHtml
  const html = htmlCorreo({
    asunto,
    saludo,
    parrafos: [
      `Hace <strong>${c.dias} días</strong> que no entras en Físicas Élite. ${e(plan)}, así que tienes todo tu entrenamiento esperándote justo donde lo dejaste.`,
      'La constancia es lo que marca la diferencia el día de la prueba. Aunque hoy solo tengas tiempo para una sesión corta, cuenta.',
    ],
    boton: { texto: 'Volver a entrenar', url: urlInicio },
    cierre:
      'Si te ha surgido algo o tienes dudas con el plan, escríbele a tu preparador por el chat de la plataforma.',
    pie: `Te mandamos este aviso porque tienes un plan activo y llevas más de ${DIAS_INACTIVIDAD} días sin entrar. Puedes <a href="${e(urlPerfil)}" style="color:#7A5F1E;">desactivar estos recordatorios desde tu perfil</a>.`,
  })

  return { asunto, html, texto }
}
