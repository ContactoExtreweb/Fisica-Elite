// Corazón del control de acceso por ruta. Se ejecuta en CADA petición.
//
// OPTIMIZACIÓN CLAVE DE RENDIMIENTO:
// Un visitante ANÓNIMO (sin cookie de sesión) no tiene nada que validar,
// así que NO llamamos a Supabase para él. Antes, cada visita —incluida la
// home pública— esperaba a `getUser()`, y en el plan gratuito Supabase
// tarda 15-25 s en "despertar" tras un rato inactivo. Resultado: la web
// pública cargaba en segundos aunque no necesitara la base de datos para
// nada. Ahora la web pública se sirve al instante, sin depender de Supabase.
//
// Solo cuando SÍ hay cookie de sesión validamos contra Supabase (necesario
// por seguridad y para refrescar el token con @supabase/ssr).
//
// ⚠️ ESTE ARCHIVO SE PISÓ UNA VEZ (commit b99da4c) con una versión antigua
// que perdía el atajo de anónimos y recortaba RUTAS_PUBLICAS a ['/', '/login'].
// Consecuencia: la web pública redirigía a /login y el webhook de Stripe
// recibía un 307, así que ningún pago daba acceso. Si vuelves a tocar este
// archivo, comprueba las dos cosas antes de commitear.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas (visibles sin sesión), por PREFIJO: cubre también sus
// subrutas (p. ej. '/pago' cubre '/pago/exito').
//
// OJO: '/registro' NO va aquí. En este proyecto '/registro' es "Mi
// progreso" del alumno (privado), no un alta de usuario.
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
  '/oposiciones', // por prefijo: cubre /oposiciones/policia-nacional, etc.
  '/legal',
]

export async function updateSession(request: NextRequest) {
  const ruta = request.nextUrl.pathname
  const esPublica =
    ruta === '/' ||
    RUTAS_PUBLICAS.some((p) => p !== '/' && (ruta === p || ruta.startsWith(p + '/')))

  // ¿Hay cookie de sesión de Supabase? Se llaman sb-<ref>-auth-token
  // (y .0, .1... si el token es grande). Si no hay ninguna, es anónimo.
  const tieneCookieSesion = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  // --- ATAJO: visitante anónimo (sin cookie) → NO tocamos Supabase --------
  if (!tieneCookieSesion) {
    if (esPublica) {
      // Web pública: al instante, sin llamadas a la base de datos.
      return NextResponse.next({ request })
    }
    // Ruta protegida sin sesión → a login (tampoco hace falta Supabase).
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // --- Hay cookie de sesión: validamos y aplicamos reglas (como siempre) --
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

  // La cookie existía pero el token es inválido/caducado → tratar como anónimo
  if (!user) {
    if (esPublica) return supabaseResponse
    return redirigir('/login')
  }

  // Con sesión válida: reglas según perfil.
  // La RLS permite a cada usuario leer su propio perfil.
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, must_change_password, cuestionario_completado, presencial')
    .eq('id', user.id)
    .single()

  // 1. Primer acceso: no puede ir a ningún otro sitio hasta cambiarla
  if (perfil?.must_change_password && ruta !== '/cambiar-password') {
    return redirigir('/cambiar-password')
  }

  // 2. Alumno que aún no ha hecho el cuestionario inicial: a /bienvenida.
  //    (Los admin no lo necesitan, y los alumnos PRESENCIALES tampoco: no
  //    tienen categorías que responder, solo reservan clase.)
  if (
    perfil?.rol === 'alumno' &&
    !perfil?.cuestionario_completado &&
    !perfil?.presencial &&
    ruta !== '/bienvenida' &&
    ruta !== '/cambiar-password'
  ) {
    return redirigir('/bienvenida')
  }

  // 3. /admin/* solo para rol admin
  if (ruta.startsWith('/admin') && perfil?.rol !== 'admin') {
    return redirigir('/inicio')
  }

  // 4. Un usuario logueado no pinta nada en /login
  if (ruta === '/login') {
    return redirigir(perfil?.rol === 'admin' ? '/admin' : '/inicio')
  }

  return supabaseResponse
}
