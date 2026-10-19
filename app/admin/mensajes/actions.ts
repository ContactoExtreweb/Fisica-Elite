'use server'

// Mensajes del formulario de contacto de la web pública.
//
// Solo se marcan como atendidos: NO se borran. La tabla no tiene política de
// DELETE (migración 013) y tampoco interesa perder un contacto, que es una
// venta posible.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'

export async function marcarMensaje(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase
    .from('mensajes_contacto')
    .update({ leido: formData.get('leido') === '1' })
    .eq('id', id)

  revalidatePath('/admin/mensajes')
  revalidatePath('/admin')
}
