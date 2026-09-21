'use server'

// Guarda un mensaje del formulario público de contacto.
//
// Inserta con el cliente ADMIN (service_role), no con el anónimo. Antes la
// tabla tenía una política "cualquiera puede insertar", y como la clave anónima
// viaja en el navegador, cualquiera podía saltarse este formulario (y su freno
// por IP y sus topes de tamaño) y llenar la tabla llamando directamente a la
// API de Supabase. Con la migración 031 esa política se elimina: el ÚNICO
// camino para escribir un mensaje es este, ya validado y con límite de uso.
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { consumirLimite, huellaIp, ipDe } from '@/lib/limites'

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
  // Topes de tamaño: la tabla es de inserción pública, y sin esto cualquiera
  // podía guardar un texto enorme en el nombre o el correo.
  if (nombre.length > 100 || email.length > 200 || telefono.length > 30) {
    return { error: 'Alguno de los datos es demasiado largo. Revísalos.' }
  }

  // Freno por IP: 5 mensajes a la hora y 15 al día. Es más que de sobra para
  // una persona y corta a quien use el formulario para llenar la bandeja. Si el
  // contador falla, se deja pasar: no se pierde un contacto por un fallo interno.
  const cupo = await consumirLimite(huellaIp('ct', ipDe(await headers())), 5, 15)
  if (cupo === 'excedido') {
    return { error: 'Has enviado varios mensajes seguidos. Inténtalo de nuevo más tarde.' }
  }

  const oposicion = OPOSICIONES.includes(oposicionRaw) ? oposicionRaw : null

  const supabase = createAdminClient()
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
