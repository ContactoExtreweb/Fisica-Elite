'use client'

// Punto rojo con el número de no leídos, montado sobre el enlace de Chat.
// Se actualiza en vivo: escucha inserts en 'mensajes' y refresca el
// conteo del servidor. La RLS decide qué mensajes cuentan para cada uno.
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BadgeNoLeidos({ inicial }: { inicial: number }) {
  const [n, setN] = useState(inicial)

  // Recalcular el conteo desde el servidor (fuente de verdad con RLS)
  const recalcular = useCallback(async () => {
    try {
      const res = await fetch('/api/no-leidos', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setN(data.n ?? 0)
    } catch {
      // silencioso: si falla, se queda con el último valor
    }
  }, [])

  useEffect(() => {
    // Mantener sincronizado con el valor del servidor al navegar
    setN(inicial)
  }, [inicial])

  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    let canal: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }
      if (cancelado) return

      // Cualquier cambio en 'mensajes' (nuevo mensaje o marcado como leído)
      // dispara un recálculo del contador.
      canal = supabase
        .channel('badge-no-leidos')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mensajes' },
          () => recalcular()
        )
        .subscribe()
    })()

    return () => {
      cancelado = true
      if (canal) supabase.removeChannel(canal)
    }
  }, [recalcular])

  if (n <= 0) return null

  return <span className="nav-badge">{n > 99 ? '99+' : n}</span>
}
