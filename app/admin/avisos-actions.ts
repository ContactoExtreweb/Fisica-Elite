'use server'

// El interruptor de los avisos por correo del PREPARADOR, en el dashboard.
// (El alumno tiene el suyo en /perfil.) Comparte columna: profiles.avisos_email.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import { prepararAviso, entregarConDetalle, avisoPrueba } from '@/lib/avisos'

export async function guardarAvisosAdmin(formData: FormData) {
  const { supabase, user } = await exigirAdmin()
  await supabase
    .from('profiles')
    .update({ avisos_email: formData.get('avisos_email') === 'on' })
    .eq('id', user.id)
  revalidatePath('/admin')
}

export type ResultadoPrueba = { correo: string; push: string }

/**
 * Manda un aviso de prueba AL PROPIO PREPARADOR, por correo y push, y
 * devuelve qué ha pasado con cada uno. Los avisos de verdad van en segundo
 * plano y si fallan solo queda en el log de Vercel; esto lo enseña en pantalla.
 */
export async function probarAvisos(): Promise<ResultadoPrueba> {
  const { supabase, user } = await exigirAdmin()
  const listo = await prepararAviso(supabase, user.id, avisoPrueba)
  if (!listo) {
    return {
      correo: 'No se ha podido leer tu perfil.',
      push: 'No se ha podido leer tu perfil.',
    }
  }
  return entregarConDetalle(listo)
}
