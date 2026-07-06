'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validarPassword } from '@/lib/validacion'
import type { EstadoForm } from '@/app/login/actions'

export async function cambiarPassword(
  _prev: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const password = String(formData.get('password') ?? '')
  const confirmar = String(formData.get('confirmar') ?? '')

  // Validación en SERVIDOR (la del navegador es solo cortesía)
  const fallo = validarPassword(password)
  if (fallo) return { error: fallo }
  if (password !== confirmar) {
    return { error: 'Las contraseñas no coinciden' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return {
      error:
        error.code === 'same_password'
          ? 'La nueva contraseña no puede ser igual a la actual'
          : 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
    }
  }

  // Ya no hace falta forzar el cambio: levantamos la barrera
  await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user!.id)

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user!.id)
    .single()

  redirect(perfil?.rol === 'admin' ? '/admin' : '/inicio')
}
