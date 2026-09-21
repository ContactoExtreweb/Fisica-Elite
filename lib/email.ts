// Envío de correos con Resend — SOLO servidor.
//
// Se usa su API por fetch (igual que Bunny en lib/bunny.ts): no hace
// falta instalar ninguna dependencia para un POST.
//
// Variables (.env.local y Vercel, NINGUNA con NEXT_PUBLIC_):
//   RESEND_API_KEY   → re_… (resend.com → API Keys)
//   EMAIL_FROM       → "Físicas Élite <avisos@dominio>". Sin dominio
//                      verificado, solo vale "…<onboarding@resend.dev>"
//   EMAIL_PRUEBAS_A  → (opcional) si está, TODOS los correos van a esta
//                      dirección en vez de al alumno. Mientras el dominio
//                      no esté verificado Resend solo deja enviar a la
//                      dirección de la propia cuenta, así que en pruebas
//                      es obligatorio. En producción se BORRA.
import 'server-only'

const API = 'https://api.resend.com/emails'

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

/** Dirección a la que se desvía todo en modo pruebas (null = modo real) */
export function emailModoPruebas(): string | null {
  return process.env.EMAIL_PRUEBAS_A?.trim() || null
}

/** Para meter texto del usuario (nombres) en el HTML del correo */
export function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** URL pública de la web, para los enlaces de los correos */
export function urlBase(): string {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (explicita) return explicita
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL // la pone Vercel sola
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

/** Adjunto de Resend. Con content_id va EN LÍNEA: el HTML lo usa con cid: */
export type Adjunto = { filename: string; content: string; content_id?: string }

export type Email = {
  para: string
  asunto: string
  html: string
  texto: string
  adjuntos?: Adjunto[]
}
export type ResultadoEmail = { ok: true; id: string } | { ok: false; error: string }

export async function enviarEmail(e: Email): Promise<ResultadoEmail> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) return { ok: false, error: 'El email no está configurado' }

  const pruebas = emailModoPruebas()
  const para = pruebas ?? e.para
  const asunto = pruebas ? `[PRUEBA → ${e.para}] ${e.asunto}` : e.asunto

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [para],
        subject: asunto,
        html: e.html,
        text: e.texto,
        ...(e.adjuntos?.length ? { attachments: e.adjuntos } : {}),
      }),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) return { ok: false, error: data.message ?? `Resend respondió ${res.status}` }
    return { ok: true, id: data.id ?? '' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red' }
  }
}
