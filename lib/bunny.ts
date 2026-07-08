// Integración con Bunny Stream — SOLO servidor.
// Aquí viven las tres claves (.env.local):
//   BUNNY_STREAM_LIBRARY_ID  → id numérico de la Video Library
//   BUNNY_STREAM_API_KEY     → API key de la librería (Video API)
//   BUNNY_STREAM_TOKEN_KEY   → Token authentication key (firma los embeds)
// Ninguna sale jamás al navegador: el cliente solo recibe firmas temporales.
import 'server-only'
import { createHash } from 'crypto'

const API_BASE = 'https://video.bunnycdn.com'

const libraryId = () => process.env.BUNNY_STREAM_LIBRARY_ID ?? ''
const apiKey = () => process.env.BUNNY_STREAM_API_KEY ?? ''
const tokenKey = () => process.env.BUNNY_STREAM_TOKEN_KEY ?? ''

export function bunnyConfigurado(): boolean {
  return Boolean(libraryId() && apiKey() && tokenKey())
}

function sha256hex(texto: string): string {
  return createHash('sha256').update(texto).digest('hex')
}

/** Crea el objeto vídeo en Bunny y devuelve su guid. */
export async function crearVideoBunny(titulo: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/library/${libraryId()}/videos`, {
    method: 'POST',
    headers: { AccessKey: apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: titulo }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.guid ?? null
}

/** Firma temporal para que el NAVEGADOR suba directo a Bunny vía TUS. */
export function firmaSubidaTus(videoGuid: string) {
  const expiracion = Math.floor(Date.now() / 1000) + 60 * 60 * 6 // 6 h: margen para archivos grandes
  const firma = sha256hex(libraryId() + apiKey() + expiracion + videoGuid)
  return { firma, expiracion, libraryId: libraryId() }
}

/** URL del reproductor con token de acceso temporal (embed firmado). */
export function urlEmbedFirmada(videoGuid: string, segundosValida = 60 * 60 * 3): string {
  const expires = Math.floor(Date.now() / 1000) + segundosValida
  const token = sha256hex(tokenKey() + videoGuid + expires)
  return `https://iframe.mediadelivery.net/embed/${libraryId()}/${videoGuid}?token=${token}&expires=${expires}&autoplay=false&preload=false`
}

/** Datos del vídeo (duración, estado de procesado). */
export async function obtenerVideoBunny(
  videoGuid: string
): Promise<{ length: number; status: number } | null> {
  const res = await fetch(`${API_BASE}/library/${libraryId()}/videos/${videoGuid}`, {
    headers: { AccessKey: apiKey() },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return { length: data?.length ?? 0, status: data?.status ?? 0 }
}

/** Borra el vídeo en Bunny (best-effort: si falla, no rompemos el flujo). */
export async function borrarVideoBunny(videoGuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/library/${libraryId()}/videos/${videoGuid}`, {
      method: 'DELETE',
      headers: { AccessKey: apiKey() },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}
