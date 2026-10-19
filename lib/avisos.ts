// Avisos al alumno — SOLO servidor.
//
// Un único sitio por el que pasan los cuatro avisos que pidió el cliente:
//   · mensaje nuevo del preparador en el chat
//   · clase presencial reservada para mañana
//   · suscripción a punto de caducar
//   · prueba real corregida
//
// Dos canales, cada uno con SU consentimiento:
//   · CORREO (Resend): interruptor profiles.avisos_email, en /perfil.
//   · PUSH (OneSignal): el permiso del navegador. Si no lo ha dado, no hay
//     suscripción en OneSignal y la llamada simplemente no entrega nada.
//   Sin las variables de entorno, cada canal se queda callado y no pasa nada.
//
// ⚠️ UN AVISO NUNCA PUEDE ROMPER LA ACCIÓN QUE LO DISPARA. Si Resend o
// OneSignal fallan, se escribe en el log y se sigue: antes está mandar el
// mensaje del chat o guardar la corrección.
//
// ⚠️ EN LOS AVISOS NO VA EL CONTENIDO. Ni el texto del mensaje del chat ni
// el de la corrección: solo "tienes algo nuevo" y el enlace. El correo y las
// notificaciones del móvil se ven en pantallas ajenas.
//
// Reparto del trabajo (importante para las server actions):
//   · prepararAviso() lee la base de datos → se llama DENTRO de la petición.
//   · entregarAviso() solo habla con Resend y OneSignal → se puede llamar
//     con after() de Next, ya mandada la respuesta, sin tocar cookies.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  enviarEmail,
  emailConfigurado,
  emailModoPruebas,
  escaparHtml,
  htmlCorreo,
  urlBase,
} from '@/lib/email'
import { LOGO_ADJUNTO } from '@/lib/email-logo'
import { fechaLarga, horaCorta } from '@/lib/fechas'
import { nombreOposicion } from '@/lib/oposiciones'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>

export type TipoAviso =
  // al alumno
  | 'mensaje'
  | 'clase'
  | 'caducidad'
  | 'evaluacion'
  | 'ventana'
  | 'ventana-cierra'
  | 'clase-cancelada'
  | 'bienvenida'
  | 'rechazo'
  // al preparador
  | 'admin-mensaje'
  | 'admin-prueba'
  | 'admin-solicitud'
  | 'admin-renovacion'
  | 'admin-contacto'
  | 'admin-cancelacion'

export type Aviso = {
  tipo: TipoAviso
  asunto: string
  html: string
  texto: string
  /** Lo que se ve en la notificación del móvil: corto y sin datos personales. */
  push: { titulo: string; cuerpo: string; ruta: string }
}

export type AvisoListo = {
  userId: string
  email: string | null // null = no quiere correo o no tiene dirección
  aviso: Aviso
}

/** Para construir el mensaje hace falta saber a quién va dirigido. */
type Destinatario = { nombre: string; base: string }

// ---------------------------------------------------------------------
//  Preparar y entregar
// ---------------------------------------------------------------------

/**
 * Lee a quién hay que avisar y monta el mensaje. Devuelve null si no hay
 * nadie a quien avisar. NO manda nada: eso es entregarAviso().
 */
export async function prepararAviso(
  supabase: SB,
  userId: string,
  construir: (d: Destinatario) => Aviso
): Promise<AvisoListo | null> {
  if (!userId) return null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('nombre, email, avisos_email')
      .eq('id', userId)
      .single()
    if (!data) return null

    const aviso = construir({
      nombre: (data.nombre ?? '').trim().split(' ')[0],
      base: urlBase(),
    })
    // Si la migración 034 todavía no está aplicada, la columna no existe, la
    // consulta falla y no se manda NADA (ni correo ni push). Es a propósito:
    // antes que avisar sin saber si el alumno lo quiere, no avisar.
    const quiereCorreo = data.avisos_email === true && !!data.email
    return { userId, email: quiereCorreo ? (data.email as string) : null, aviso }
  } catch (e) {
    console.error('[avisos] no se pudo preparar el aviso', e)
    return null
  }
}

/** Manda el correo y el push. No lanza nunca. */
export async function entregarAviso(listo: AvisoListo | null): Promise<void> {
  if (!listo) return
  const { email, aviso, userId } = listo
  await Promise.all([
    email && emailConfigurado()
      ? enviarEmail({
          para: email,
          asunto: aviso.asunto,
          html: aviso.html,
          texto: aviso.texto,
          adjuntos: [LOGO_ADJUNTO],
        })
          .then((r) => {
            if (!r.ok) console.error('[avisos] correo', aviso.tipo, r.error)
          })
          .catch((e) => console.error('[avisos] correo', aviso.tipo, e))
      : Promise.resolve(),
    enviarPush(userId, aviso).catch((e) => {
      console.error('[avisos] push', aviso.tipo, e)
    }),
  ])
}

/** Preparar + entregar de una vez (para la tarea diaria, sin petición web). */
export async function avisar(
  supabase: SB,
  userId: string,
  construir: (d: Destinatario) => Aviso
): Promise<void> {
  await entregarAviso(await prepararAviso(supabase, userId, construir))
}

/**
 * Avisos para el PREPARADOR. Los dispara casi siempre una acción del alumno
 * (te ha escrito, ha subido su prueba, ha cancelado su clase), y un alumno no
 * puede leer el perfil del preparador: su RLS solo le deja ver el suyo. Por eso
 * aquí se usa el cliente de service_role, que es exactamente para esto: saltar
 * la RLS en el servidor cuando no hay otra forma. Solo lee nombre y correo de
 * quien tiene rol 'admin'.
 */
export async function prepararAvisosAdmins(
  construir: (d: Destinatario) => Aviso
): Promise<AvisoListo[]> {
  try {
    const { data } = await createAdminClient()
      .from('profiles')
      .select('id, nombre, email, avisos_email')
      .eq('rol', 'admin')
    const base = urlBase()
    return (data ?? []).map((a) => ({
      userId: a.id as string,
      email: a.avisos_email === true && a.email ? (a.email as string) : null,
      aviso: construir({ nombre: (a.nombre ?? '').trim().split(' ')[0], base }),
    }))
  } catch (e) {
    console.error('[avisos] no se pudo preparar el aviso al preparador', e)
    return []
  }
}

export async function entregarAvisos(listos: AvisoListo[]): Promise<void> {
  for (const l of listos) await entregarAviso(l)
}

/** Preparar + entregar a los admin de una vez. */
export async function avisarAdmins(construir: (d: Destinatario) => Aviso): Promise<void> {
  await entregarAvisos(await prepararAvisosAdmins(construir))
}

/**
 * Aviso a alguien que TODAVÍA NO tiene cuenta (una solicitud rechazada). Solo
 * puede ir por correo: sin cuenta no hay a quién mandarle un push.
 */
export function avisoSuelto(
  email: string | null,
  nombre: string,
  construir: (d: Destinatario) => Aviso
): AvisoListo | null {
  if (!email) return null
  return {
    userId: '',
    email,
    aviso: construir({ nombre: (nombre ?? '').trim().split(' ')[0], base: urlBase() }),
  }
}

// ---------------------------------------------------------------------
//  Push (OneSignal)
// ---------------------------------------------------------------------

// OneSignal identifica a cada alumno por su id de la plataforma, que el
// navegador le declara con OneSignal.login() (ver components/AvisosPush.tsx).
// Por eso no hace falta guardar aquí ninguna suscripción.
const ONESIGNAL_API = 'https://api.onesignal.com/notifications'

export function pushConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY)
}

export type ResultadoPush =
  | { estado: 'sin-configurar' }
  | { estado: 'enviado'; id: string }
  | { estado: 'sin-destinatario'; detalle: string }
  | { estado: 'error'; detalle: string }

async function enviarPush(userId: string, aviso: Aviso): Promise<ResultadoPush> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const key = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !key) return { estado: 'sin-configurar' }
  // Sin cuenta en la plataforma no hay a quién mandarle un push (p. ej. una
  // solicitud rechazada: esa persona todavía no es alumno).
  if (!userId) return { estado: 'sin-destinatario', detalle: 'no tiene cuenta' }

  const res = await fetch(ONESIGNAL_API, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      target_channel: 'push',
      include_aliases: { external_id: [userId] },
      // 'en' es el idioma por defecto que exige OneSignal; el texto va en
      // castellano en los dos para que no salga vacío en ningún navegador.
      headings: { en: aviso.push.titulo, es: aviso.push.titulo },
      contents: { en: aviso.push.cuerpo, es: aviso.push.cuerpo },
      url: `${urlBase()}${aviso.push.ruta}`,
    }),
    cache: 'no-store',
  })

  // ⚠️ OneSignal responde 200 AUNQUE NO LLEGUE A NADIE: en ese caso el 'id'
  // viene vacío y el motivo va en 'errors' (p. ej. que esa persona no tiene
  // ninguna suscripción activa). Hay que mirar el cuerpo, no solo el código:
  // mirando solo el código, un aviso que no llegaba a nadie pasaba por bueno.
  const cuerpo = (await res.json().catch(() => null)) as { id?: string; errors?: unknown } | null
  if (res.ok && cuerpo?.id && !cuerpo.errors) return { estado: 'enviado', id: cuerpo.id }

  const detalle = JSON.stringify(cuerpo?.errors ?? cuerpo ?? null).slice(0, 300)
  if (res.ok) {
    // Lo normal cuando esa persona no ha activado las notificaciones.
    console.warn('[avisos] OneSignal sin destinatario', aviso.tipo, detalle)
    return { estado: 'sin-destinatario', detalle }
  }
  console.error('[avisos] OneSignal', res.status, aviso.tipo, detalle)
  return { estado: 'error', detalle: `HTTP ${res.status} ${detalle}` }
}

/**
 * Lo mismo que entregarAviso, pero ESPERANDO y contando qué ha pasado con
 * cada canal, en castellano. Es para el botón «Enviarme un aviso de prueba»
 * del panel: los avisos normales se mandan en segundo plano y, si fallan,
 * solo queda en el log de Vercel.
 */
export async function entregarConDetalle(
  listo: AvisoListo
): Promise<{ correo: string; push: string }> {
  const pruebas = emailModoPruebas()
  const correo = !listo.email
    ? 'No se manda: no tienes correo en tu perfil o tienes el interruptor apagado.'
    : !emailConfigurado()
      ? 'No se manda: el correo (Resend) no está configurado.'
      : await enviarEmail({
          para: listo.email,
          asunto: listo.aviso.asunto,
          html: listo.aviso.html,
          texto: listo.aviso.texto,
          adjuntos: [LOGO_ADJUNTO],
        }).then((r) =>
          r.ok
            ? `Enviado${pruebas ? ` (modo pruebas: llega a ${pruebas})` : ` a ${listo.email}`}.`
            : `Resend lo ha rechazado: ${r.error}`
        )

  const r = await enviarPush(listo.userId, listo.aviso).catch(
    (e): ResultadoPush => ({ estado: 'error', detalle: e instanceof Error ? e.message : 'error' })
  )
  const push =
    r.estado === 'sin-configurar'
      ? 'OneSignal no está configurado: faltan NEXT_PUBLIC_ONESIGNAL_APP_ID u ONESIGNAL_REST_API_KEY en Vercel (y redesplegar).'
      : r.estado === 'enviado'
        ? 'OneSignal lo ha aceptado y lo ha mandado a tu navegador. Si no te ha salido en pantalla, el bloqueo está en el propio navegador o en Windows (notificaciones desactivadas o modo «No molestar»).'
        : r.estado === 'sin-destinatario'
          ? `OneSignal no tiene ninguna suscripción tuya activa, así que no ha llegado a ningún sitio. Activa las notificaciones aquí mismo, en este navegador. (Detalle: ${r.detalle})`
          : `OneSignal ha rechazado la petición. Lo más probable es que la ONESIGNAL_REST_API_KEY de Vercel no sea la buena. (Detalle: ${r.detalle})`

  return { correo, push }
}

/** El aviso que manda el botón de prueba. */
export function avisoPrueba({ nombre, base }: Destinatario): Aviso {
  const asunto = 'Aviso de prueba de Físicas Élite'
  return {
    tipo: 'admin-mensaje',
    asunto,
    html: htmlCorreo({
      asunto,
      saludo: saludoDe(nombre),
      parrafos: ['Esto es un aviso de prueba. Si lo estás leyendo, los avisos por correo funcionan.'],
      boton: { texto: 'Volver al panel', url: `${base}/admin` },
    }),
    texto: [
      `${saludoDe(nombre)}:`,
      '',
      'Esto es un aviso de prueba. Si lo lees, los avisos por correo funcionan.',
      '',
      `${base}/admin`,
    ].join('\n'),
    push: {
      titulo: 'Aviso de prueba',
      cuerpo: 'Si ves esto, las notificaciones funcionan.',
      ruta: '/admin',
    },
  }
}

// ---------------------------------------------------------------------
//  Los cuatro avisos
// ---------------------------------------------------------------------

const e = escaparHtml

/** Pie común: cómo dejar de recibirlos. */
function pieAvisos(base: string): { html: string; texto: string } {
  const url = `${base}/perfil`
  return {
    html: `Recibes este aviso porque tienes activados los avisos de la plataforma. Puedes <a href="${e(url)}" style="color:#7A5F1E;">desactivarlos desde tu perfil</a>.`,
    texto: `Puedes desactivar estos avisos desde tu perfil: ${url}`,
  }
}

function saludoDe(nombre: string): string {
  return nombre ? `Hola, ${nombre}` : 'Hola'
}

/** Mensaje nuevo del preparador. Sin el texto del mensaje, a propósito. */
export function avisoMensaje({ nombre, base }: Destinatario): Aviso {
  const asunto = 'Tienes un mensaje de tu preparador'
  const url = `${base}/chat`
  const pie = pieAvisos(base)
  return {
    tipo: 'mensaje',
    asunto,
    html: htmlCorreo({
      asunto,
      saludo: saludoDe(nombre),
      parrafos: [
        'Tu preparador te ha escrito por el chat de Físicas Élite. Entra a leerlo y respóndele cuando puedas.',
      ],
      boton: { texto: 'Leer el mensaje', url },
      pie: pie.html,
    }),
    texto: [
      `${saludoDe(nombre)}:`,
      '',
      'Tu preparador te ha escrito por el chat de Físicas Élite.',
      '',
      `Leer el mensaje: ${url}`,
      '',
      '—',
      pie.texto,
    ].join('\n'),
    push: {
      titulo: 'Mensaje de tu preparador',
      cuerpo: 'Te ha escrito por el chat. Toca para leerlo.',
      ruta: '/chat',
    },
  }
}

/** Recordatorio de la clase presencial de mañana. */
export function avisoClase(hora: string, fecha: string) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const h = horaCorta(hora)
    const asunto = `Mañana tienes clase a las ${h}`
    const url = `${base}/reservas`
    const pie = pieAvisos(base)
    const cuando = `mañana ${fechaLarga(fecha)} a las ${h}`
    return {
      tipo: 'clase',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `Te recordamos que tienes reservada tu clase presencial <strong>${e(cuando)}</strong>.`,
          'Si al final no puedes ir, cancélala desde la plataforma para dejarle la plaza a otro compañero.',
        ],
        boton: { texto: 'Ver mis reservas', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `Tienes reservada tu clase presencial ${cuando}.`,
        'Si no puedes ir, cancélala para dejarle la plaza a otro compañero.',
        '',
        `Tus reservas: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `Mañana tienes clase a las ${h}`,
        cuerpo: 'Si no puedes ir, cancela la plaza desde la app.',
        ruta: '/reservas',
      },
    }
  }
}

/** Aviso de que se le acaba el acceso. */
export function avisoCaducidad(fechaFin: string, planes: string[], dias: number) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const fecha = fechaLarga(fechaFin)
    const asunto = `Tu acceso termina el ${fecha}`
    const url = `${base}/suscripcion`
    const pie = pieAvisos(base)
    const queCaduca =
      planes.length === 0
        ? 'Tu acceso a la plataforma'
        : planes.length === 1
          ? `Tu plan «${planes[0]}»`
          : `Tus planes ${planes.map((p) => `«${p}»`).join(', ')}`
    return {
      tipo: 'caducidad',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `${e(queCaduca)} termina el <strong>${e(fecha)}</strong>, dentro de ${dias} días.`,
          'Si renuevas antes de esa fecha no pierdes nada: sigues justo donde lo dejaste, con tus marcas y tu progreso.',
        ],
        boton: { texto: 'Renovar mi acceso', url },
        cierre: 'Si prefieres cambiar de plan o tienes dudas, escríbele a tu preparador por el chat.',
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${queCaduca} termina el ${fecha}, dentro de ${dias} días.`,
        'Si renuevas antes no pierdes nada: sigues con tus marcas y tu progreso.',
        '',
        `Renovar: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `Tu acceso termina el ${fecha}`,
        cuerpo: 'Renuévalo para seguir entrenando sin cortes.',
        ruta: '/suscripcion',
      },
    }
  }
}

/** Prueba real corregida. Sin el texto de la corrección, a propósito. */
export function avisoEvaluacion({ nombre, base }: Destinatario): Aviso {
  const asunto = 'Tu preparador ya ha corregido tu prueba'
  const url = `${base}/evaluaciones`
  const pie = pieAvisos(base)
  return {
    tipo: 'evaluacion',
    asunto,
    html: htmlCorreo({
      asunto,
      saludo: saludoDe(nombre),
      parrafos: [
        'Tu preparador ha revisado el vídeo de tu última prueba real y te ha dejado su corrección en la plataforma.',
      ],
      boton: { texto: 'Ver la corrección', url },
      pie: pie.html,
    }),
    texto: [
      `${saludoDe(nombre)}:`,
      '',
      'Tu preparador ha revisado el vídeo de tu última prueba real y te ha dejado su corrección.',
      '',
      `Verla: ${url}`,
      '',
      '—',
      pie.texto,
    ].join('\n'),
    push: {
      titulo: 'Tu prueba ya está corregida',
      cuerpo: 'Tu preparador te ha dejado su corrección.',
      ruta: '/evaluaciones',
    },
  }
}

// ---------------------------------------------------------------------
//  Más avisos al alumno
// ---------------------------------------------------------------------

/** Se abre el plazo para subir la prueba real. */
export function avisoVentana(categoria: string | null, nombrePlazo: string, fin: string) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const que = categoria ? `tu prueba de ${categoria}` : 'tu prueba real'
    const asunto = `Ya puedes subir ${que}`
    const url = `${base}/evaluaciones`
    const pie = pieAvisos(base)
    const hasta = fechaLarga(fin)
    return {
      tipo: 'ventana',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `Se ha abierto el plazo <strong>${e(nombrePlazo)}</strong>: ya puedes grabarte haciendo ${e(que)} y subir el vídeo para que tu preparador te corrija la técnica.`,
          `Tienes hasta el <strong>${e(hasta)}</strong>. Grábate de cuerpo entero y con buena luz, que se vea bien la ejecución.`,
        ],
        boton: { texto: 'Subir mi prueba', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `Se ha abierto el plazo "${nombrePlazo}": ya puedes subir el vídeo de ${que} para que tu preparador te corrija.`,
        `Tienes hasta el ${hasta}.`,
        '',
        `Subirla: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `Ya puedes subir ${que}`,
        cuerpo: `Tienes de plazo hasta el ${hasta}.`,
        ruta: '/evaluaciones',
      },
    }
  }
}

/** Se acaba el plazo y todavía no ha subido nada. */
export function avisoVentanaCierra(categoria: string | null, fin: string, dias: number) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const que = categoria ? `tu prueba de ${categoria}` : 'tu prueba real'
    const cuando = dias === 1 ? 'mañana' : `dentro de ${dias} días`
    const asunto = `Te queda poco para subir ${que}`
    const url = `${base}/evaluaciones`
    const pie = pieAvisos(base)
    return {
      tipo: 'ventana-cierra',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `El plazo para subir ${e(que)} se cierra <strong>${e(cuando)}</strong>, el ${e(fechaLarga(fin))}, y todavía no has subido el vídeo.`,
          'Es la forma que tiene tu preparador de ver cómo vas de verdad y corregirte antes del examen. No la dejes pasar.',
        ],
        boton: { texto: 'Subir mi prueba', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `El plazo para subir ${que} se cierra ${cuando}, el ${fechaLarga(fin)}, y todavía no has subido el vídeo.`,
        '',
        `Subirla: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `El plazo se cierra ${cuando}`,
        cuerpo: `Todavía no has subido ${que}.`,
        ruta: '/evaluaciones',
      },
    }
  }
}

/** Su clase presencial se ha cancelado (la cancela el preparador o bloquea el turno). */
export function avisoClaseCancelada(fecha: string, hora: string, motivo: string | null) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const cuando = `${fechaLarga(fecha)} a las ${horaCorta(hora)}`
    const asunto = `Se ha cancelado tu clase del ${fechaLarga(fecha)}`
    const url = `${base}/reservas`
    const pie = pieAvisos(base)
    return {
      tipo: 'clase-cancelada',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `Tu preparador ha cancelado la clase que tenías reservada el <strong>${e(cuando)}</strong>.` +
            (motivo ? ` Motivo: ${e(motivo)}.` : ''),
          'No tienes que hacer nada: la reserva ya está anulada. Puedes coger otro turno cuando quieras.',
        ],
        boton: { texto: 'Reservar otro turno', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `Tu preparador ha cancelado la clase que tenías reservada el ${cuando}.${motivo ? ` Motivo: ${motivo}.` : ''}`,
        'La reserva ya está anulada; puedes coger otro turno cuando quieras.',
        '',
        `Reservar: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: 'Se ha cancelado tu clase',
        cuerpo: `La del ${cuando}. Puedes coger otro turno.`,
        ruta: '/reservas',
      },
    }
  }
}

/**
 * Bienvenida con las credenciales, al aprobar su solicitud.
 *
 * ⚠️ La contraseña va DENTRO del correo por decisión del cliente (19/10/2026).
 * Es de un solo uso: la plataforma obliga a cambiarla en el primer acceso
 * (profiles.must_change_password), y el correo se lo dice bien claro.
 */
export function avisoBienvenida(usuario: string, email: string, password: string) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const asunto = 'Tu acceso a Físicas Élite ya está listo'
    const url = `${base}/login`
    return {
      tipo: 'bienvenida',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: nombre ? `Bienvenido, ${nombre}` : 'Bienvenido a Físicas Élite',
        parrafos: [
          'Tu preparador ya te ha dado de alta. Estas son tus claves para entrar:',
          `<span style="display:block;background:#F2EFE8;border:1px solid #DED9C0;border-radius:10px;padding:14px 16px;font-size:15px;line-height:1.8;">Usuario: <strong>${e(usuario || email)}</strong><br>Contraseña: <strong style="font-family:Consolas,Menlo,monospace;letter-spacing:0.5px;">${e(password)}</strong></span>`,
          '<strong>Esta contraseña es solo para entrar la primera vez.</strong> Nada más acceder, la plataforma te pedirá que elijas una tuya. Cuando lo hagas, borra este correo.',
        ],
        boton: { texto: 'Entrar en la plataforma', url },
        cierre:
          'Lo primero que verás es un cuestionario corto para saber por dónde empiezas. Después tendrás tus ejercicios, tus vídeos y el chat con tu preparador.',
        pie: 'Si no esperabas este correo, escríbenos y lo miramos.',
      }),
      texto: [
        nombre ? `Bienvenido, ${nombre}:` : 'Bienvenido a Físicas Élite:',
        '',
        'Tu preparador ya te ha dado de alta. Tus claves para entrar:',
        '',
        `  Usuario: ${usuario || email}`,
        `  Contraseña: ${password}`,
        '',
        'Esta contraseña es solo para el primer acceso: la plataforma te pedirá',
        'que elijas una tuya nada más entrar. Después, borra este correo.',
        '',
        `Entrar: ${url}`,
      ].join('\n'),
      push: { titulo: '', cuerpo: '', ruta: '/login' },
    }
  }
}

/** Su solicitud no se tramita (con o sin devolución). */
export function avisoRechazo(conDevolucion: boolean) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const asunto = 'Sobre tu solicitud en Físicas Élite'
    const pie = `Si crees que ha sido un error o quieres contarnos tu caso, escríbenos desde <a href="${e(base)}/contacto" style="color:#7A5F1E;">la página de contacto</a>.`
    const devuelto = conDevolucion
      ? 'El importe que pagaste ya está devuelto: según tu banco, tarda entre 5 y 10 días en aparecer en tu cuenta. No tienes que hacer nada.'
      : 'Si hiciste algún pago, nos pondremos en contacto contigo para devolvértelo.'
    return {
      tipo: 'rechazo',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          'Hemos revisado tu solicitud y finalmente no vamos a poder tramitar el alta.',
          devuelto,
        ],
        cierre: 'Sentimos las molestias.',
        pie,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        'Hemos revisado tu solicitud y finalmente no vamos a poder tramitar el alta.',
        devuelto,
        '',
        `Si crees que es un error, escríbenos: ${base}/contacto`,
      ].join('\n'),
      push: { titulo: '', cuerpo: '', ruta: '/' },
    }
  }
}

// ---------------------------------------------------------------------
//  Avisos para el preparador
// ---------------------------------------------------------------------

/** Pie de los avisos del preparador: él no se da de baja desde /perfil. */
function pieAdmin(base: string): { html: string; texto: string } {
  const url = `${base}/admin`
  return {
    html: `Avisos de la plataforma. Puedes desactivarlos desde <a href="${e(url)}" style="color:#7A5F1E;">el panel</a>.`,
    texto: `Puedes desactivar estos avisos desde el panel: ${url}`,
  }
}

/** Un alumno le ha escrito por el chat. */
export function avisoAdminMensaje(alumno: string) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const asunto = `${alumno} te ha escrito`
    const url = `${base}/admin/chat`
    const pie = pieAdmin(base)
    return {
      tipo: 'admin-mensaje',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `<strong>${e(alumno)}</strong> te ha escrito un mensaje por el chat de la plataforma.`,
        ],
        boton: { texto: 'Abrir el chat', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${alumno} te ha escrito por el chat.`,
        '',
        `Abrirlo: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `${alumno} te ha escrito`,
        cuerpo: 'Toca para abrir el chat.',
        ruta: '/admin/chat',
      },
    }
  }
}

/** Un alumno ha subido su prueba real y espera corrección. */
export function avisoAdminPrueba(alumno: string, categoria: string | null) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const que = categoria ? `su prueba de ${categoria}` : 'su prueba real'
    const asunto = `${alumno} ha subido ${que}`
    const url = `${base}/admin/evaluaciones`
    const pie = pieAdmin(base)
    return {
      tipo: 'admin-prueba',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `<strong>${e(alumno)}</strong> ha subido el vídeo de ${e(que)} y está esperando tu corrección.`,
        ],
        boton: { texto: 'Ver la prueba', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${alumno} ha subido ${que} y espera tu corrección.`,
        '',
        `Verla: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `${alumno} ha subido su prueba`,
        cuerpo: 'Está esperando tu corrección.',
        ruta: '/admin/evaluaciones',
      },
    }
  }
}

/** Alguien ha pagado y espera que le abras la cuenta. */
export function avisoAdminSolicitud(quien: string, plan: string | null, importe: string | null) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const asunto = `Nueva solicitud de alta pagada: ${quien}`
    const url = `${base}/admin/solicitudes`
    const pie = pieAdmin(base)
    const detalle = [plan ? `Plan: ${plan}` : null, importe ? `Importe: ${importe} €` : null]
      .filter(Boolean)
      .join(' · ')
    return {
      tipo: 'admin-solicitud',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `<strong>${e(quien)}</strong> ha pagado y está esperando a que le des de alta.`,
          ...(detalle ? [e(detalle)] : []),
          'Hasta que tramites la solicitud desde el panel, no tiene acceso a nada.',
        ],
        boton: { texto: 'Tramitar el alta', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${quien} ha pagado y está esperando a que le des de alta.`,
        ...(detalle ? [detalle] : []),
        'Hasta que tramites la solicitud, no tiene acceso a nada.',
        '',
        `Tramitarla: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: 'Nueva solicitud de alta pagada',
        cuerpo: `${quien} espera que le abras la cuenta.`,
        ruta: '/admin/solicitudes',
      },
    }
  }
}

/** Un alumno que ya tenía cuenta ha renovado o ha contratado otro plan. */
export function avisoAdminRenovacion(alumno: string, plan: string | null, meses: number) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const asunto = `${alumno} ha renovado`
    const url = `${base}/admin/alumnos`
    const pie = pieAdmin(base)
    const detalle = `${plan ? `«${plan}»` : 'Su plan'} · ${meses} ${meses === 1 ? 'mes' : 'meses'}`
    return {
      tipo: 'admin-renovacion',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `<strong>${e(alumno)}</strong> ha pagado desde la plataforma: ${e(detalle)}.`,
          'No tienes que hacer nada: el acceso ya está ampliado automáticamente.',
        ],
        boton: { texto: 'Ver mis alumnos', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${alumno} ha pagado desde la plataforma: ${detalle}.`,
        'El acceso ya está ampliado automáticamente.',
        '',
        url,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: { titulo: `${alumno} ha renovado`, cuerpo: detalle, ruta: '/admin/alumnos' },
    }
  }
}

/** Mensaje del formulario de contacto de la web pública. */
export function avisoAdminContacto(m: {
  nombre: string
  email: string
  telefono: string | null
  oposicion: string | null
  mensaje: string
}) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const asunto = `Mensaje de contacto de ${m.nombre}`
    const url = `${base}/admin/mensajes`
    const pie = pieAdmin(base)
    const datos = [
      `Correo: ${m.email}`,
      m.telefono ? `Teléfono: ${m.telefono}` : null,
      m.oposicion ? `Oposición: ${nombreOposicion(m.oposicion)}` : null,
    ].filter((d): d is string => !!d)
    return {
      tipo: 'admin-contacto',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `<strong>${e(m.nombre)}</strong> ha escrito desde el formulario de la web:`,
          `<span style="display:block;background:#F2EFE8;border-left:3px solid #C09D39;border-radius:6px;padding:12px 14px;white-space:pre-wrap;">${e(m.mensaje)}</span>`,
          datos.map((d) => e(d)).join('<br>'),
        ],
        boton: { texto: 'Ver en el panel', url },
        cierre: `Puedes responderle directamente a <a href="mailto:${e(m.email)}" style="color:#7A5F1E;">${e(m.email)}</a>.`,
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${m.nombre} ha escrito desde el formulario de la web:`,
        '',
        m.mensaje,
        '',
        ...datos,
        '',
        `En el panel: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `Mensaje de ${m.nombre}`,
        cuerpo: 'Nuevo contacto desde la web.',
        ruta: '/admin/mensajes',
      },
    }
  }
}

/** Un alumno ha cancelado su clase presencial. */
export function avisoAdminCancelacion(alumno: string, fecha: string, hora: string) {
  return ({ nombre, base }: Destinatario): Aviso => {
    const cuando = `${fechaLarga(fecha)} a las ${horaCorta(hora)}`
    const asunto = `${alumno} ha cancelado su clase`
    const url = `${base}/admin/reservas?fecha=${fecha}`
    const pie = pieAdmin(base)
    return {
      tipo: 'admin-cancelacion',
      asunto,
      html: htmlCorreo({
        asunto,
        saludo: saludoDe(nombre),
        parrafos: [
          `<strong>${e(alumno)}</strong> ha cancelado su reserva del <strong>${e(cuando)}</strong>. La plaza vuelve a estar libre.`,
        ],
        boton: { texto: 'Ver la agenda', url },
        pie: pie.html,
      }),
      texto: [
        `${saludoDe(nombre)}:`,
        '',
        `${alumno} ha cancelado su reserva del ${cuando}. La plaza vuelve a estar libre.`,
        '',
        `Agenda: ${url}`,
        '',
        '—',
        pie.texto,
      ].join('\n'),
      push: {
        titulo: `${alumno} ha cancelado`,
        cuerpo: `Su clase del ${cuando}. Plaza libre.`,
        ruta: '/admin/reservas',
      },
    }
  }
}
