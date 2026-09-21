// Asistente virtual: endpoint del chat.
//
//  GET  → { disponible, modo }   (para que el widget sepa qué saludo y qué
//                                 atajos enseñar; no gasta cuota)
//  POST → { respuesta }          (un turno de conversación)
//
// SEGURIDAD — leer antes de tocar:
//  · El MODO (visitante o alumno) lo decide AQUÍ, por la sesión. El
//    navegador no puede pedirse el modo de alumno.
//  · Al modelo no se le manda ningún dato del usuario: solo su pregunta y la
//    información general del negocio (lib/asistente/conocimiento.ts). Un
//    alumno con un ejercicio abierto añade, además, el TEXTO de esa ficha,
//    leído con su propia sesión (RLS): ve el asistente lo que ve el alumno.
//  · Cada POST consume cuota por persona y global (lib/asistente/limites.ts)
//    ANTES de llamar al modelo. Si no se puede comprobar, se rechaza.
//  · Tamaños acotados: pocos mensajes, cortos. Nada de historiales enormes.
//  · Misma-origen: se rechaza si Origin no es este propio sitio, para que
//    otra web no gaste la cuota desde el navegador de sus visitantes.
//  · No se guarda ningún mensaje: la conversación vive en el navegador.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/publico'
import { planesALaVenta } from '@/lib/planes'
import { promptSistema, type ModoAsistente } from '@/lib/asistente/conocimiento'
import { contextoAlumno } from '@/lib/asistente/contexto'
import {
  asistenteConfigurado,
  pedirRespuesta,
  type MensajeAsistente,
} from '@/lib/asistente/proveedor'
import { claveAlumno, consumirTurno, huellaVisitante } from '@/lib/asistente/limites'
import { ipDe } from '@/lib/limites'

// Los modelos gratuitos a veces tardan; el tope de 25 s del proveedor cabe aquí.
export const maxDuration = 30

const MAX_MENSAJES = 12 // los últimos que se aceptan de la conversación
const MAX_CHARS_USUARIO = 500
const MAX_CHARS_ASISTENTE = 1200
const MAX_CHARS_TOTAL = 6000

const respuesta = (cuerpo: object, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * Modo según la sesión, el id si es alumno y el cliente CON SU SESIÓN (para
 * leer sus ejercicios bajo la misma RLS que la web). Sin cookie no se llama
 * a Supabase.
 */
async function quienEs() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const modo: ModoAsistente = user ? 'alumno' : 'publico'
  return { modo, userId: user?.id ?? null, supabase }
}

export async function GET() {
  const { modo } = await quienEs()
  return respuesta({ disponible: asistenteConfigurado(), modo })
}

export async function POST(request: Request) {
  if (!asistenteConfigurado()) {
    return respuesta({ error: 'El asistente no está disponible ahora mismo.' }, 503)
  }

  // Solo desde este mismo sitio. (Las peticiones del propio navegador
  // llevan Origin; si viene y no coincide con el host, fuera.)
  const origen = request.headers.get('origin')
  if (origen) {
    let mismoSitio = false
    try {
      mismoSitio = new URL(origen).host === request.headers.get('host')
    } catch {
      mismoSitio = false
    }
    if (!mismoSitio) return respuesta({ error: 'Petición no permitida.' }, 403)
  }

  // --- Entrada: validada y acotada ---
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return respuesta({ error: 'Petición no válida.' }, 400)
  }

  const bruto = (cuerpo as { mensajes?: unknown })?.mensajes
  if (!Array.isArray(bruto) || bruto.length === 0) {
    return respuesta({ error: 'Petición no válida.' }, 400)
  }

  const mensajes: MensajeAsistente[] = []
  for (const m of bruto.slice(-MAX_MENSAJES)) {
    const role = (m as { role?: unknown })?.role
    const content = (m as { content?: unknown })?.content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return respuesta({ error: 'Petición no válida.' }, 400)
    }
    const texto = content.trim()
    const tope = role === 'user' ? MAX_CHARS_USUARIO : MAX_CHARS_ASISTENTE
    if (!texto || texto.length > tope) {
      return respuesta(
        { error: role === 'user' ? `El mensaje es demasiado largo (máximo ${MAX_CHARS_USUARIO} caracteres).` : 'Petición no válida.' },
        400
      )
    }
    // Dos turnos seguidos del mismo rol (p. ej. una pregunta que falló y otra
    // nueva) se juntan: algunos proveedores exigen que se alternen.
    const anterior = mensajes[mensajes.length - 1]
    if (anterior && anterior.role === role) anterior.content += '\n' + texto
    else mensajes.push({ role, content: texto })
  }
  // Y la conversación empieza siempre por el usuario (el recorte a los
  // últimos mensajes puede haber dejado una respuesta del asistente delante).
  while (mensajes.length > 0 && mensajes[0].role !== 'user') mensajes.shift()
  if (mensajes.length === 0 || mensajes[mensajes.length - 1].role !== 'user') {
    return respuesta({ error: 'Petición no válida.' }, 400)
  }
  if (mensajes.reduce((s, m) => s + m.content.length, 0) > MAX_CHARS_TOTAL) {
    return respuesta({ error: 'La conversación es demasiado larga. Empieza una nueva.' }, 400)
  }

  // Ejercicio que el alumno tiene abierto (solo se usa con sesión; se valida
  // dentro de contextoAlumno y la RLS decide si lo puede ver).
  const slugEjercicio = (cuerpo as { ejercicio?: unknown })?.ejercicio
  const ejercicioPedido = typeof slugEjercicio === 'string' ? slugEjercicio : null

  // --- Quién es y cuota ---
  const { modo, userId, supabase } = await quienEs()
  const clave = userId ? claveAlumno(userId) : huellaVisitante(ipDe(request.headers))

  const cuota = await consumirTurno(clave, modo === 'alumno')
  if (cuota === 'persona') {
    return respuesta(
      { error: 'Has hecho muchas preguntas seguidas. Espera un rato y vuelve a probar.' },
      429
    )
  }
  if (cuota === 'global') {
    return respuesta({ error: 'El asistente está muy ocupado ahora. Inténtalo más tarde.' }, 429)
  }
  if (cuota === 'error') {
    return respuesta({ error: 'El asistente no está disponible ahora mismo.' }, 503)
  }

  // --- Modelo ---
  try {
    const [planes, alumno] = await Promise.all([
      planesALaVenta(createPublicClient()),
      // Solo con sesión, y siempre con la sesión del propio alumno (RLS)
      userId ? contextoAlumno(supabase, ejercicioPedido) : Promise.resolve(undefined),
    ])
    const texto = await pedirRespuesta(promptSistema(modo, planes, alumno), mensajes)
    return respuesta({ respuesta: texto })
  } catch (e) {
    // Solo al log del servidor; el navegador recibe un mensaje genérico.
    console.error('[asistente]', e instanceof Error ? e.message : e)
    return respuesta({ error: 'No he podido responder ahora. Inténtalo de nuevo en un momento.' }, 502)
  }
}
