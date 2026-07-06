'use client'

import { borrarEjercicio } from '@/app/admin/ejercicios/actions'

export default function BorrarEjercicio({ id }: { id: string }) {
  return (
    <form
      action={borrarEjercicio}
      onSubmit={(e) => {
        if (!confirm('¿Seguro que quieres borrar este ejercicio? No se puede deshacer.')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-peligro">
        Borrar ejercicio
      </button>
    </form>
  )
}
