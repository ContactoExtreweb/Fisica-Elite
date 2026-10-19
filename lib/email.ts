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
import { LOGO_CID } from '@/lib/email-logo'

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

/**
 * El HTML de TODOS los correos de la plataforma, para que todos se vean
 * igual y haya un solo sitio donde tocar el diseño.
 *
 * HTML de correo: tablas y estilos en línea (Gmail y Outlook ignoran
 * <style> y flexbox). Colores de la marca: negro verdoso, ocre, hueso.
 *
 * ⚠️ `parrafos`, `cierre` y `pie` entran como HTML TAL CUAL (para poder
 * meter un <strong> o un enlace). Lo que venga de un usuario se pasa
 * antes por escaparHtml(). La versión en texto plano la monta cada
 * correo por su cuenta.
 */
export function htmlCorreo(p: {
  asunto: string
  saludo: string
  parrafos: string[]
  boton?: { texto: string; url: string }
  cierre?: string
  pie?: string
}): string {
  const e = escaparHtml
  const fila = (estilo: string, contenido: string) =>
    `<tr><td style="${estilo}">${contenido}</td></tr>`

  const cuerpo = [
    fila(
      'padding:22px 28px 8px;font-size:22px;font-weight:700;line-height:1.3;',
      e(p.saludo)
    ),
    ...p.parrafos.map((t) =>
      fila('padding:8px 28px;font-size:15px;line-height:1.6;color:#23302A;', t)
    ),
    p.boton
      ? fila(
          'padding:22px 28px 8px;',
          `<a href="${e(p.boton.url)}" style="display:inline-block;background:#030E0A;color:#FFFFF0;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:100px;">${e(p.boton.texto)}</a>`
        )
      : '',
    p.cierre
      ? fila('padding:14px 28px 28px;font-size:14px;line-height:1.6;color:#58635C;', p.cierre)
      : '',
    p.pie
      ? fila(
          'padding:16px 28px 22px;border-top:1px solid #DED9C0;font-size:12px;line-height:1.5;color:#8A948D;',
          p.pie
        )
      : '',
  ].join('\n')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(p.asunto)}</title></head>
<body style="margin:0;padding:0;background:#F2EFE8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFE8;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFF0;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#030E0A;">
<tr><td align="center" style="padding:30px 28px 16px;"><img src="cid:${LOGO_CID}" width="93" height="110" alt="Físicas Élite" style="display:block;border:0;outline:none;width:93px;height:110px;"></td></tr>
<tr><td align="center" style="padding:0 0 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="48" height="3" style="background:#C09D39;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
${cuerpo}
</table>
</td></tr>
</table>
</body></html>`
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
