// Llamada al modelo de IA del asistente virtual.
//
// SOLO SERVIDOR. Habla el formato "chat completions" de OpenAI, que
// aceptan casi todos los proveedores (Mistral, Groq, OpenRouter, Cloudflare,
// Gemini en su modo compatible…). Así el proveedor se cambia con TRES
// variables de entorno, sin tocar código:
//
//   ASISTENTE_API_URL   base de la API, sin la ruta final
//                       (p. ej. https://api.mistral.ai/v1)
//   ASISTENTE_API_KEY   la clave del proveedor (SECRETA, solo servidor)
//   ASISTENTE_MODEL     nombre del modelo tal como lo llama el proveedor
//
// Si falta cualquiera, el asistente se declara "no disponible" y no hace
// ninguna llamada. Ninguna empieza por NEXT_PUBLIC_: nunca llegan al navegador.
import 'server-only'
import { limpiarFormato } from '@/lib/asistente/formato'

export type MensajeAsistente = { role: 'user' | 'assistant'; content: string }

export function asistenteConfigurado(): boolean {
  return !!(
    process.env.ASISTENTE_API_URL &&
    process.env.ASISTENTE_API_KEY &&
    process.env.ASISTENTE_MODEL
  )
}

/** Respuesta corta y sobria: ni creatividad ni parrafadas. */
const MAX_TOKENS = 400
const TEMPERATURA = 0.3
const TIMEOUT_MS = 25_000

export async function pedirRespuesta(
  sistema: string,
  historial: MensajeAsistente[]
): Promise<string> {
  const base = process.env.ASISTENTE_API_URL!.replace(/\/+$/, '')

  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS)

  const llamar = () =>
    fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ASISTENTE_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.ASISTENTE_MODEL,
        messages: [{ role: 'system', content: sistema }, ...historial],
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURA,
      }),
      signal: controlador.signal,
      cache: 'no-store',
    })

  try {
    let res = await llamar()

    // Los planes gratuitos suelen limitar a ~1 petición por segundo: si dos
    // visitantes preguntan a la vez, al segundo le llega un 429 que se arregla
    // esperando un momento. Un único reintento, respetando Retry-After (con tope).
    if (res.status === 429) {
      const pedido = Number(res.headers.get('retry-after'))
      const espera = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido * 1000, 3000) : 1300
      await new Promise((r) => setTimeout(r, espera))
      res = await llamar()
    }

    if (!res.ok) {
      // No se devuelve el cuerpo del error al navegador: puede llevar detalles
      // de la cuenta del proveedor. Solo el código, para los logs de Vercel.
      throw new Error(`El proveedor respondió ${res.status}`)
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[]
    }
    const contenido = json.choices?.[0]?.message?.content

    // Algunos proveedores devuelven el contenido como lista de trozos.
    const texto =
      typeof contenido === 'string'
        ? contenido
        : Array.isArray(contenido)
          ? contenido
              .map((t) => (typeof t === 'string' ? t : ((t as { text?: string })?.text ?? '')))
              .join('')
          : ''

    // Se quita el markdown que se cuelan los modelos pequeños: el chat pinta texto plano
    const limpio = limpiarFormato(texto)
    if (!limpio) throw new Error('El proveedor devolvió una respuesta vacía')
    return limpio
  } finally {
    clearTimeout(temporizador)
  }
}
