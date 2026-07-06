# Física Élite — Scaffold de autenticación (paso 1)

Flujo que implementa este paquete:

```
/login  →  primer acceso: /cambiar-password (obligatorio)  →  /inicio o /admin según rol
```

Con middleware que protege todas las rutas, fuerza el cambio de
contraseña en el primer acceso y bloquea /admin a los no-admin.

---

## 1 · Crear el proyecto

```bash
npx create-next-app@latest fisica-elite --typescript --app --no-tailwind --eslint --no-src-dir --import-alias "@/*"
cd fisica-elite
npm install @supabase/supabase-js @supabase/ssr
```

(Si pregunta por Turbopack, cualquiera de las dos opciones vale.)

## 2 · Copiar este paquete

Descomprime el zip **dentro de la carpeta `fisica-elite`** (la raíz del
proyecto), aceptando sobrescribir. Pisa `app/layout.tsx`, `app/page.tsx`
y `app/globals.css` del boilerplate — es lo esperado.

Puedes borrar `app/page.module.css` del boilerplate: ya no se usa.

## 3 · Variables de entorno

Renombra `env.local.example` a `.env.local` y rellena con
**Dashboard → Project Settings → API** de tu proyecto Supabase
(URL del proyecto + anon/publishable key).

## 4 · Ajustes en Supabase (2 minutos, importantes)

1. **Authentication → Sign In / Providers → desactiva "Allow new users
   to sign up"**. Las altas SOLO las hacen los admins; sin esto,
   cualquiera podría registrarse por la API.
2. **Authentication → Providers → Email → Minimum password length: 8**
   (defensa en profundidad: la misma regla también en Supabase).

## 5 · Usuario de prueba

Dashboard → **Authentication → Users → Add user**:
- Email: el tuyo
- Contraseña temporal: p. ej. `Temporal1!`
- Marca **Auto Confirm User**

Al crearse, el trigger `handle_new_user` de la migración 001 le crea el
perfil automáticamente con `must_change_password = true`.

## 6 · Probar el flujo alumno

```bash
npm run dev
```

1. Abre `http://localhost:3000` → home pública → **Acceder**
2. Entra con el email + contraseña temporal
3. Te fuerza a **/cambiar-password** (intenta ir a /inicio a mano: te devuelve)
4. Prueba una contraseña mala (p. ej. `abc123`) → error del servidor
5. Pon una válida (mín. 8, letra + número + especial) → entras a **/inicio**
6. Verás tu email, rol `alumno`, nivel `iniciado` → la RLS funciona
7. Escribe `/admin` en la barra → te expulsa a /inicio (no eres admin)
8. Cierra sesión → intenta /inicio → te manda a /login

## 7 · Probar el flujo admin

En el **SQL Editor** de Supabase:

```sql
update public.profiles
set rol = 'admin'
where id = (select id from auth.users where email = 'TU_EMAIL');
```

Vuelve a entrar → ahora aterrizas en **/admin**.

---

## Qué hay en cada archivo

| Archivo | Qué hace |
|---|---|
| `middleware.ts` + `lib/supabase/middleware.ts` | Refresco de sesión + TODAS las reglas de acceso por ruta |
| `lib/supabase/server.ts` / `client.ts` | Clientes Supabase servidor / navegador |
| `lib/validacion.ts` | Regla de contraseña (constante `PASSWORD_MIN` para ajustarla) |
| `app/login/` | Página + Server Action de login y logout |
| `app/cambiar-password/` | Cambio obligatorio en primer acceso |
| `app/inicio/` y `app/admin/` | Placeholders protegidos para verificar el flujo |
| `app/globals.css` | Tokens + estilos del mockup portados |
| `app/layout.tsx` | Fuentes del mockup (Syne, Manrope, Instrument Serif) vía next/font |
