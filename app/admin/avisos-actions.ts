'use server'

// El interruptor de los avisos por correo del PREPARADOR, en el dashboard.
// (El alumno tiene el suyo en /perfil.) Comparte columna: profiles.avisos_email.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'

export async function guardarAvisosAdmin(formData: FormData) {
  const { supabase, user } = await exigirAdmin()
  await supabase
    .from('profiles')
    .update({ avisos_email: formData.get('avisos_email') === 'on' })
    .eq('id', user.id)
  revalidatePath('/admin')
}
