'use server'

// Guarda un mensaje del formulario público de contacto.
// Usa el cliente anónimo del servidor; la RLS permite el insert público.
import { createClient } from '@/lib/supabase/server'

export type EstadoContacto = { ok?: boolean; error?: string }

const OPOSICIONES = ['policia_local', 'policia_nacional', 'guardia_civil', 'fuerzas_armadas', 'otra']

export async function enviarContacto(
  _prev: EstadoContacto,
  formData: FormData
): Promise<EstadoContacto> {
  // Honeypot: campo oculto 'web'. Si viene relleno, es un bot.
  if (String(formData.get('web') ?? '').trim()) {
    // Fingimos éxito para no dar pistas al bot
    return { ok: true }
  }

  const nombre = String(formData.get('nombre') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const telefono = String(formData.get('telefono') ?? '').trim()
  const oposicionRaw = String(formData.get('oposicion') ?? '').trim()
  const mensaje = String(formData.get('mensaje') ?? '').trim()

  if (!nombre || !email || !mensaje) {
    return { error: 'Rellena tu nombre, tu email y el mensaje.' }
  }
  if (!email.includes('@') || email.length < 5) {
    return { error: 'Revisa tu correo electrónico.' }
  }

  const oposicion = OPOSICIONES.includes(oposicionRaw) ? oposicionRaw : null

  const supabase = await createClient()
  const { error } = await supabase.from('mensajes_contacto').insert({
    nombre,
    email,
    telefono: telefono || null,
    oposicion,
    mensaje: mensaje.slice(0, 2000),
  })

  if (error) {
    return { error: 'No se pudo enviar el mensaje. Inténtalo de nuevo en un momento.' }
  }

  return { ok: true }
}
