// Corazón del control de acceso por ruta. Se ejecuta en CADA petición:
//  1. Refresca la sesión (imprescindible con @supabase/ssr).
//  2. Bloquea rutas protegidas si no hay usuario.
//  3. Fuerza el cambio de contraseña en el primer acceso.
//  4. Protege /admin por rol.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas (visibles sin sesión), por PREFIJO: cubre también sus
// subrutas (p. ej. '/pago' cubre '/pago/exito' y '/pago/cancelado').
// Añade aquí las futuras secciones públicas cuando existan.
const RUTAS_PUBLICAS = [
  '/', // home (coincidencia exacta, ver abajo)
  '/login',
  '/precios',
  '/pago',
  '/api/checkout', // el formulario público de pago llama aquí (sin sesión)
  '/api/webhooks', // Stripe llama al webhook desde fuera, sin sesión
  '/sobre-nosotros',
  '/instalaciones',
  '/contacto',
  '/legal',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida el token contra Supabase (seguro en servidor).
  // No usar getSession() aquí: no revalida.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = request.nextUrl.pathname
  // Home solo coincidencia exacta; el resto por prefijo (cubre subrutas)
  const esPublica =
    ruta === '/' ||
    RUTAS_PUBLICAS.some((p) => p !== '/' && (ruta === p || ruta.startsWith(p + '/')))

  // Redirige conservando las cookies de sesión refrescadas
  const redirigir = (destino: string) => {
    const url = request.nextUrl.clone()
    url.pathname = destino
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => res.cookies.set(c.name, c.value))
    return res
  }

  // --- Sin sesión: solo rutas públicas -------------------------
  if (!user) {
    if (esPublica) return supabaseResponse
    return redirigir('/login')
  }

  // --- Con sesión: aplicar reglas según perfil ------------------
  // La RLS permite a cada usuario leer su propio perfil.
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, must_change_password')
    .eq('id', user.id)
    .single()

  // 1. Primer acceso: no puede ir a ningún otro sitio hasta cambiarla
  if (perfil?.must_change_password && ruta !== '/cambiar-password') {
    return redirigir('/cambiar-password')
  }

  // 2. /admin/* solo para rol admin
  if (ruta.startsWith('/admin') && perfil?.rol !== 'admin') {
    return redirigir('/inicio')
  }

  // 3. Un usuario logueado no pinta nada en /login
  if (ruta === '/login') {
    return redirigir(perfil?.rol === 'admin' ? '/admin' : '/inicio')
  }

  return supabaseResponse
}