# FÍSICAS ÉLITE — Manual de traspaso del proyecto

> **Para quién es este documento:** para Pedro Fernández Sánchez y su agente
> de Claude, que van a terminar el proyecto. Está escrito para que puedas
> pegarlo entero en Claude y que entienda el proyecto sin necesitar nada más.
>
> **Escrito por:** Saúl Correyero Pañero (desarrollador hasta ahora), con
> ayuda de Claude, el 18 de agosto de 2026. **Actualizado el 21 de septiembre
> de 2026: ver la sección 0 bis, que es el estado real.**
>
> La fecha de entrega comprometida (1 de septiembre) ya pasó. Las secciones 8, 9
> y 10 son del 18 de agosto y están **superadas** por la 0 bis.

---

## 0. Aviso importante antes de empezar

> **(Texto del 18 de agosto. Hoy el código está terminado; ver 0 bis.)**

Este proyecto está **muy avanzado pero NO terminado**, y quedan cosas que
son **obligatorias** para poder entregar. Lee las secciones 7 y 8 antes de
tocar código: hay un problema de diseño en el modelo de acceso (sección
8.4) que hay que resolver **antes** de montar los pagos, porque afecta a
qué se le vende a cada alumno.

Léelo todo antes de escribir la primera línea. El proyecto tiene muchas
decisiones tomadas y muchas trampas ya pisadas; repetirlas cuesta días.

---

## 0 bis. ACTUALIZACIÓN DEL 21 DE SEPTIEMBRE DE 2026 — LEE ESTO PRIMERO

> El resto de este manual se escribió el 18 de agosto. **Casi todo lo que
> allí figura como pendiente ya está hecho**, y desde entonces se añadieron
> funciones que no aparecen abajo. Esta sección es el estado real. Si algo
> de las secciones 8, 9 y 10 la contradice, manda esta.

### Estado en una frase

El código está **terminado**. Lo que queda depende del cliente o de
terceros (dominio, datos fiscales, cobros en real): ver «En espera».

### Hecho desde el 18 de agosto

**Modelo y pagos** — especialidad opcional (9.1), suscripciones en el perfil
(9.2), `/suscripcion` con contratar y renovar (9.3), checkout por plan con el
precio leído de la BBDD (9.5, **falta lo de producción**), rebranding a
«Físicas Élite» con la paleta del logo (9.6).

**Web pública** — home con hero, oposiciones y fichas por cuerpo
(`/oposiciones/<slug>`), menú móvil a pantalla completa, `/precios` con la
misma barra que el resto, **planes dinámicos en el Inicio** (salen de la
tabla `planes`; página con ISR de 60 s vía `lib/supabase/publico.ts`, y las
acciones del admin llaman a `revalidatePath('/')`), **reseñas manuales**
(migraciones 026–028; se editan en `/admin/resenas`; el Inicio enseña las 6
primeras, «Sobre nosotros» todas), `sitemap.ts` y `robots.ts`, páginas legales
(aviso, privacidad, cookies).

**Área del alumno** — `/inicio` como panel (continúa por donde lo dejaste,
siguiente ejercicio, accesos, resumen, últimas marcas; mig. 025),
`/ejercicios`, `/explicaciones` (ejercicios «explicativos», mig. 021),
**reservas de clases presenciales** (mig. 022; calendario para el alumno,
agenda y horario para el admin; solo alumnos marcados como presenciales),
**marca de agua** con el id del alumno sobre el vídeo (`VideoProtegido`),
«Pruebas reales» cada 6 semanas (mig. 018–019), barra inferior en móvil con
«Más», cuestionario inicial con datos físicos y botón de omitir.

**Admin** — alumnos rediseñados, chat que puede abrir el propio admin
(mig. 024), **recordatorios por inactividad** (mig. 023; `lib/recordatorios.ts`,
Resend, cron diario en `vercel.json`), **nivel (tramo) reasignable por
alumno** (`components/TramosAlumno.tsx`; lo que fija el admin lleva
`origen = 'admin'` y el cuestionario del alumno **no lo pisa**), **rechazar
una solicitud y devolver el pago** por Stripe (`rechazarYReembolsar`, mig. 030;
idempotente, con confirmación explícita).

**Asistente virtual (chatbot)** — botón flotante en la web pública y en el área
del alumno. Ver «Asistente virtual» abajo.

**Endurecimiento** — cabeceras de seguridad en `next.config.ts`, freno por IP
en contacto, checkout y asistente (`lib/limites.ts`), el origen de vuelta de
Stripe ya no se fía del encabezado `Origin` (`lib/site.ts → origenSeguro`),
topes de tamaño en el formulario de contacto.

**Limpieza** — código muerto borrado (`app/(publica)/`, `HeaderPublico`),
eslint sin errores en todo el proyecto, `.claude/` en `.gitignore`.

### En espera (depende del cliente o de terceros)

1. **Separar contenido de oposición del individual (9.4). SIGUE ABIERTO.**
   `cubierto_por_plan` no se ha tocado: un plan `completo` da acceso a todo,
   también a los ejercicios marcados para una oposición. Hoy no hay planes de
   oposición a la venta, así que no hay fuga, pero la habrá en cuanto los haya.
   Hay que decidirlo con el cliente (opciones A/B/C en 9.4) antes de tocar nada.
2. **Datos del titular y de contacto en `lib/legal.ts` (`DATOS`).** Mientras
   estén como PENDIENTE, las páginas legales los enseñan resaltados en amarillo
   y **el teléfono y el correo públicos NO se muestran** (sale de
   `contactoPublico()`). Al rellenarlos aparecen solos en contacto, pie, menú
   móvil y legales.
3. **Lanzamiento:** dominio; verificar el dominio en Resend, poner `EMAIL_FROM`
   y **borrar `EMAIL_PRUEBAS_A`**; Stripe en modo real y webhook de producción
   (`https://<dominio>/api/webhooks/stripe`, con su `whsec_` en Vercel, **suscrito a
   los eventos `checkout.session.completed` y `charge.refunded`**: sin el segundo, una
   devolución hecha en Stripe no retira el acceso); Supabase
   Pro; `NEXT_PUBLIC_SITE_URL` con el dominio (sitemap y metadatos salen de ahí).
4. **Asistente:** usar el endpoint de la UE de Mistral (`https://api.eu.mistral.ai/v1`,
   **no** `api.mistral.ai`: el global no se compromete a ningún lugar de
   procesamiento; ver `lib/legal.ts`), comprobar que el modelo elegido existe ahí, aceptar
   su DPA y valorar pasar al plan de pago con tope de gasto (el gratuito es «para
   pruebas»). Rellenar la ficha de `ASISTENTE` en `lib/legal.ts` si cambia de
   proveedor.
5. **Content-Security-Policy:** no puesta a propósito. Hecha bien necesita nonces
   para los scripts de Next y permitir Bunny, Supabase y Stripe; una a medias
   rompería el vídeo o los pagos.
6. **Prueba de seguridad del contenido de pago** con tres alumnos: uno con plan
   suelto, uno con Completo y uno con oposición (ver 9.4).

### Asistente virtual (`lib/asistente/`, `app/api/asistente`, `components/AsistenteChat.tsx`)

- **Interruptor:** `NEXT_PUBLIC_ASISTENTE=on` (se incrusta en el build). Sin él, o
  sin las claves, la web es idéntica a antes y la política de privacidad no lo
  menciona.
- **Modelo:** cualquier API tipo OpenAI, con `ASISTENTE_API_URL`,
  `ASISTENTE_API_KEY` y `ASISTENTE_MODEL`. Hoy, Mistral por su endpoint de la UE
  (`https://api.eu.mistral.ai/v1`; la política de privacidad solo dice «Unión Europea»
  si la URL es esa) con `ministral-14b-latest` (verificar que existe en esa región;
  `mistral-small-latest` da 429 en el plan gratuito). En Vercel,
  `NEXT_PUBLIC_ASISTENTE` va como **Config** (no «Secret»: Vercel no deja poner
  `NEXT_PUBLIC_` en un secreto) y la clave como **Secret**.
- **Dos modos**, decididos en el servidor por la sesión: visitante (planes,
  oposiciones, cómo empezar) y alumno (cómo usar la plataforma y, con una ficha
  de ejercicio abierta, **el texto de esa ficha**, leído con la sesión del propio
  alumno, o sea, bajo la misma RLS: nunca ve el asistente lo que no ve el alumno).
- **Privacidad:** al modelo no se le manda ningún dato personal, ni el vídeo. No
  se guarda ninguna conversación (vive en la pestaña). Los contadores de uso
  (migración 029, tabla `asistente_uso`) guardan una huella HMAC de la IP durante
  un máximo de dos días.
- **Límites:** por persona y global, en Postgres. Falla **cerrado** (sin contador,
  no atiende). En contacto y checkout falla **abierto** (no se pierde un pago).

### Trampas nuevas (se suman a la sección 6)

- **`overflow-x: hidden` va solo en `<html>`, nunca también en `<body>`.** Con los
  dos, el body se vuelve un contenedor con scroll y el menú `position: sticky`
  deja de quedarse fijo en escritorio. **Lo mismo vale para bloquear el scroll**
  (menús a pantalla completa, modales): `document.documentElement.style.overflow`,
  jamás `document.body.style.overflow`. Con el body, al abrir el menú público con
  la página algo scrolleada, la cabecera se iba fuera de pantalla y no había cruz
  para cerrarlo.
- **Rejillas y flex:** un hijo de `grid` o `flex` tiene `min-width: auto`, y un
  contenido ancho ensancha la columna por encima del móvil. Usa `minmax(0, 1fr)`
  y `min-width: 0`. Así se resolvió el desborde de `/registro`.
- **Lint de React 19 (`react-hooks`):** no se llama a `setState` dentro de un
  efecto. Para sincronizar con una prop, se ajusta **en render** (guardando la
  prop anterior en un estado); para «ya montado», `useSyncExternalStore`. No
  uses `Math.random()` ni `Date.now()` en el cuerpo de un componente.
- **`.next/types` se queda viejo** si borras una ruta: `tsc` da errores de
  módulos inexistentes hasta el siguiente `npm run build`, que lo regenera.
- **Migraciones antes que el código que las usa.** El código de reseñas (026) y
  del reembolso (030) tolera que falten; el del asistente (029) no (falla cerrado).
- **Nunca pegues ni fotografíes el `.env.local`.** Si una clave se ve, se rota.
- **`alumno_tramos` no tiene política de DELETE**, para nadie. El admin reasigna
  con upsert (no se puede «dejar sin asignar»).
- **Un vídeo de Bunny se borra solo con `borrarVideoSiNadieLoUsa`** (`lib/videos.ts`):
  primero se quita la referencia en la BBDD y después se llama a esa función, que
  no borra si otro ejercicio o prueba lo comparte. Nunca llames a `borrarVideoBunny`
  a pelo desde una acción.
- **Las subidas de pruebas de un alumno llevan un SELLO** (`selloSubida` en
  `lib/bunny.ts`): el navegador manda el id del vídeo al confirmar, y sin sellar
  se podía mandar el de un ejercicio de pago y luego borrarlo.
- **Las fechas y los meses se calculan en `lib/fechas.ts`** (`hoyMadrid`,
  `sumarMeses` con tope a fin de mes). No hagas copias locales: había seis, y
  daban fechas distintas según por dónde se contratara el plan.
- **Las tablas de escritura pública** (hoy ninguna) deben ir por el servidor con
  límite de uso, no con una política RLS `with check (true)`: la clave anónima
  viaja en el navegador y cualquiera puede llamar a la API directamente.
- **La URL del sitio sale de `lib/site.ts`** (`NEXT_PUBLIC_SITE_URL`). No la
  escribas a mano en ningún archivo.

### Migraciones desde la 017 (todas aditivas; aplicar en orden)

017 plan en la solicitud · 018 evaluaciones del alumno · 019 ventanas de
evaluación · 020 limpiar vídeos huérfanos · 021 ejercicios explicativos · 022
reservas presenciales · 023 actividad y recordatorios · 024 el admin abre chats
· 025 último ejercicio visto · 026 reseñas · 027 reseñas iniciales (opcional) ·
028 dos reseñas más · 029 límites del asistente · 030 traza de reembolsos ·
031 el formulario de contacto solo por el servidor (**aplicar DESPUÉS de
desplegar el código**, no antes) · 032 fechas de acceso en horario de Madrid (cambia
las funciones de acceso leyendo su definición; comprueba al final que salga `true`).

---

## 1. Qué es el proyecto

**Físicas Élite** (ojo: *Físicas* en plural, el cliente lo confirmó) es una
plataforma web para la preparación de las **pruebas físicas de oposiciones
españolas** (Policía Local, Policía Nacional, Guardia Civil, Fuerzas
Armadas y Vigilancia Aduanera).

Consta de dos partes:

1. **Web pública** de captación (marketing, precios, contacto).
2. **Plataforma privada de pago** con:
   - Área del alumno: vídeos de ejercicios, técnica, registro de marcas,
     chat con su preparador.
   - Panel del preparador (admin): gestión de alumnos, contenido, planes,
     precios, cobros y mensajes.

**Cliente:** un preparador físico con **unos 75 alumnos** actuales. La
plataforma sustituye su método actual (presencial + WhatsApp).

**Prioridades del cliente, en este orden:**
1. **Seguridad** — sobre todo que no se filtren datos ni pagos. Es la
   prioridad número uno y no se negocia.
2. Que el alumno solo vea el contenido que ha pagado.
3. SEO / captación (secundario).

---

## 2. Stack tecnológico y por qué

| Pieza | Tecnología | Notas importantes |
|---|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript | Se subió de 15 a 16 el 17/08/2026. Ver sección 6.10 |
| Estilos | **CSS plano** con custom properties | **NO hay Tailwind.** No lo introduzcas |
| Base de datos + Auth | **Supabase** (Postgres, región EU/Frankfurt) | RLS en todas las tablas |
| Pagos | **Stripe** (Checkout + webhooks) | En **modo test** todavía |
| Vídeo | **Bunny Stream** (EU) | URLs de embed **firmadas** |
| Hosting | **Vercel** | `fisicaelite.vercel.app`, región `fra1` |
| Emails | **Resend** | Configurado a medias, pendiente |
| Repo | GitHub **ContactoExtreweb/Fisica-Elite**, rama `main` | Push = despliegue automático en Vercel |

### Decisiones ya tomadas (no las cambies sin motivo grave)

- **Vercel y no Netlify.** Netlify da problemas con los webhooks y las
  server actions de Next. Vercel es gratis para este uso y ya está
  funcionando.
- **CSS plano y no Tailwind.** El proyecto tiene un sistema de diseño
  propio con variables. Meter Tailwind ahora sería rehacer todo.
- **Región `fra1` en Vercel** (`vercel.json`) para estar junto a Supabase
  y reducir latencia.
- **Supabase EU/Frankfurt** por RGPD (datos de ciudadanos españoles).

### Servicios y costes de producción (cuando se lance)

- **Supabase Pro: ~25 $/mes — OBLIGATORIO en producción.** El plan
  gratuito pausa el proyecto por inactividad y no tiene backups. Con datos
  de clientes que pagan, el gratuito no es aceptable.
- Bunny Stream: pago por uso (~0,01 $/GB almacenado + ~0,005 $/GB
  servido). Pocos euros al mes al principio.
- Dominio: ~10-15 €/año (aún **sin comprar**).
- Vercel: gratis para empezar.
- Resend: gratis al principio.
- Stripe: ~1,5% + 0,25 € por cobro con tarjeta del EEE. Sobre 39 €
  son unos 0,84 € (~2%). Sin cuota fija.

**Total estimado: 25-30 €/mes + dominio anual + comisiones.**

Mientras se desarrolla, hay un **GitHub Action** (`.github/workflows/keepalive.yml`)
que hace un ping diario a Supabase para que el plan gratuito no se pause.
Es un apaño de desarrollo: al lanzar, hay que pasar a Pro igualmente.

---

## 3. Estructura del proyecto

```
fisica-elite/
├── app/
│   ├── (público)
│   │   ├── page.tsx                 Home pública
│   │   ├── sobre-nosotros/
│   │   ├── instalaciones/
│   │   ├── contacto/                Formulario → tabla mensajes_contacto
│   │   ├── aviso-legal/             ⚠️ A MEDIAS
│   │   └── privacidad/              ⚠️ A MEDIAS
│   ├── login/                       + actions.ts (incluye logout)
│   ├── cambiar-password/            Obligatorio en el primer acceso
│   ├── bienvenida/                  Cuestionario inicial del alumno
│   ├── inicio/                      Área del alumno: sus ejercicios
│   │   └── progreso-actions.ts      marcarCompletado()
│   ├── ejercicio/[slug]/            Ficha del ejercicio (vídeo protegido)
│   ├── registro/                    "Mi progreso": marcas del alumno
│   ├── perfil/                      Datos del alumno (peso, altura…)
│   ├── suscripcion/                 ⚠️ MUY BÁSICA, hay que ampliarla
│   ├── chat/                        Chat alumno ↔ preparador
│   ├── admin/
│   │   ├── page.tsx                 Dashboard con Chart.js
│   │   ├── alumnos/                 Lista, ficha [id], alta manual
│   │   ├── ejercicios/              CRUD de contenido
│   │   ├── categorias/              Categorías y tramos
│   │   ├── planes/                  Planes y precios
│   │   ├── solicitudes/             Pagos pendientes de aprobar
│   │   └── chat/                    Bandeja + conversación [id]
│   └── api/
│       ├── checkout/                Stripe Checkout
│       ├── webhooks/stripe/
│       └── no-leidos/
├── components/                      Todos los componentes
├── lib/                             Utilidades (ver sección 4)
├── migraciones/                     SQL numerado 001-016
├── proxy.ts                         ⚠️ Antes era middleware.ts (Next 16)
├── vercel.json                      regions: ["fra1"]
└── .github/workflows/keepalive.yml  Ping diario a Supabase
```

---

## 4. Archivos de `lib/` que debes conocer

| Archivo | Qué hace | Cuidado con… |
|---|---|---|
| `lib/supabase/client.ts` | Cliente de navegador (anon key) | |
| `lib/supabase/server.ts` | Cliente de servidor con cookies. **Respeta la RLS** | Es el que se usa en el 95% de los casos |
| `lib/supabase/admin.ts` | `createAdminClient()` con **service_role** | **SOLO en servidor.** Salta la RLS. Nunca lo importes en un componente cliente |
| `lib/autorizacion.ts` | `exigirUsuario()` y `exigirAdmin()` → `{supabase, user}` | Úsalos siempre al principio de las server actions |
| `lib/password.ts` | `generarPasswordSegura()` con `crypto` | |
| `lib/validacion.ts` | `PASSWORD_MIN = 8` | Se queda en 8, decidido |
| `lib/stripe.ts` | Cliente de Stripe **con inicialización perezosa vía Proxy** | ⚠️ **CRÍTICO:** si lo instancias al importar, **el build de Vercel falla**. Ya pasó. No lo toques |
| `lib/bunny.ts` | `bunnyConfigurado()`, `urlEmbedFirmada(videoId)` | Lee las env **dentro** de las funciones, por lo mismo |
| `lib/marcas.ts` | Formateo de marcas según métrica | Nuevo en v2 |
| `lib/acceso.ts` | `categoriasContratadas(supabase, userId)` | Nuevo en v2. ⚠️ Ver sección 8.4 |
| `lib/no-leidos.ts` | `contarNoLeidos()` para el badge del chat | |
| `lib/slug.ts` | `slugify()` | |

---

## 5. Modelo de datos (Supabase)

### 5.1 Concepto central del modelo v2

Esto es **lo más importante que tienes que entender** del proyecto:

```
CATEGORÍA (qué se mide)          →  Dominadas, Carrera, Natación…
   ├── métrica: repeticiones | tiempo | distancia | peso
   ├── unidad:  reps | seg | m | kg
   └── TRAMOS (niveles de marca)  →  "0-9", "9-12", "12-17"
          └── valor_min / valor_max

EJERCICIO                        →  pertenece a UNA categoría
   ├── tramo_id (nullable)        →  NULL = se ve en todos los tramos
   └── ejercicio_oposiciones      →  para qué oposiciones cuenta (M:N)

PLAN (lo que se vende)
   ├── tipo 'ejercicio'  → da acceso a las categorías de plan_categorias
   ├── tipo 'completo'   → da acceso a todo
   └── tipo 'oposicion'  → da acceso al contenido de una oposición

SUSCRIPCIÓN = alumno + plan + fechas
   └── Un alumno puede tener VARIAS a la vez (1 por plan contratado)

ALUMNO_TRAMOS = en qué tramo está el alumno en cada categoría
   ├── tramo_id = X     → ve solo el tramo X
   ├── tramo_id = NULL  → ve TODOS los tramos (su marca no encajaba)
   └── sin fila         → aún no ha hecho el cuestionario
```

**La regla de oro:** el alumno ve un ejercicio si y solo si se cumplen las
cuatro condiciones a la vez:

1. El ejercicio está **publicado**
2. Tiene **suscripción activa** (`fecha_fin >= hoy`)
3. Su plan **cubre la categoría** del ejercicio
4. El **tramo encaja**: el del ejercicio es el suyo, o el ejercicio no
   tiene tramo, o se le desbloquearon todos

Esto lo hace la **RLS de Postgres**, no el código de la aplicación. Cuando
"no salen los ejercicios", el 90% de las veces es una de estas cuatro.

### 5.2 Tablas

**`profiles`** (extiende `auth.users`)
```
id (uuid, FK auth.users)   nombre, apellidos, email, username
telefono, edad, genero     especialidad (enum, nullable)   ← ver 8.1
rol ('alumno' | 'admin')   must_change_password (bool)
peso_kg, altura_cm         facilidades (text)
cuestionario_completado (bool)
```
Hay un **trigger `proteger_campos_perfil`** que impide que un alumno se
cambie el rol o la especialidad (anti-escalada de privilegios). El admin sí
puede, porque usa `service_role`.

**`categorias_ejercicio`**: `nombre, slug, metrica, unidad, descripcion, orden, activa`

**`tramos`**: `categoria_id, nombre, valor_min, valor_max, orden`
(único por `categoria_id + orden`)

**`ejercicios`**: `titulo, slug, categoria_id (NOT NULL), tramo_id (nullable),
descripcion, tecnica, errores_comunes, variantes, mejoras, video_id, orden, publicado`

**`ejercicio_oposiciones`**: `ejercicio_id, especialidad` (M:N)

**`ejercicio_faqs`**: `ejercicio_id, pregunta, respuesta, orden`

**`planes`**: `nombre, slug, tipo ('ejercicio'|'completo'|'oposicion'),
precio_centimos, especialidad (nullable), descripcion, orden, activo`
(hay un CHECK: tipo 'oposicion' exige `especialidad`)

**`plan_categorias`**: `plan_id, categoria_id` (M:N)

**`suscripciones`**: `user_id, plan_id (nullable = acceso completo, compat v1),
estado ('activa'|'cancelada'), metodo, meses, fecha_inicio, fecha_fin,
stripe_payment_intent, marcado_por, notas`

**`alumno_tramos`**: `user_id, categoria_id, tramo_id (NULLABLE), origen
('autoevaluacion'|'admin')`

**`registros_entrenamiento`**: `user_id, categoria_id, ejercicio_id (nullable),
fecha, repeticiones, peso_kg, distancia_km, tiempo_seg, series (jsonb), notas`
> `series` guarda los parciales por 100 m: `[{metros:100, segundos:15.2}, …]`
> `distancia_km` **siempre en km** y `tiempo_seg` **siempre en segundos**;
> la conversión a la unidad de la categoría se hace al mostrar.

**`evaluaciones`**: `user_id, video_id (Bunny), fecha_examen, estado
('pendiente'|'revisada'), feedback` → **tabla creada pero SIN USAR** (Fase 4)

**`progreso`**: `user_id, ejercicio_id` → ejercicios marcados como completados

**`conversaciones`** y **`mensajes`**: chat con Realtime

**`mensajes_contacto`**: formulario de la web pública

**`solicitudes`**: pagos pendientes de aprobación por el admin

### 5.3 Funciones de Postgres

| Función | Qué devuelve |
|---|---|
| `es_admin()` | ¿el usuario actual es admin? |
| `tiene_acceso_activo(uid)` | ¿tiene alguna suscripción activa vigente? |
| `mi_tramo(cat)` | el tramo del alumno en esa categoría (NULL si ve todos) |
| `ve_todos_tramos(cat)` | ¿se le desbloquearon todos los tramos? |
| `cubierto_por_plan(ejercicio_id, categoria_id)` | ¿sus planes cubren este ejercicio? ⚠️ **ver 8.4** |

### 5.4 Migraciones

Están en `migraciones/`, numeradas. Se aplican **a mano** en el **SQL
Editor de Supabase**, en orden. El SQL Editor ejecuta en transacción: si
algo falla, hace rollback limpio y puedes corregir y reintentar.

- `001` a `013` — modelo v1 (auth, ejercicios por nivel, chat, Stripe,
  progreso, web pública)
- **`014_v2_modelo.sql`** — el gran cambio a v2: categorías, tramos,
  planes, suscripciones con plan, perfil ampliado, registros, evaluaciones.
  Elimina `nivel` y el enum de niveles
- **`015_desbloqueo_total.sql`** — `alumno_tramos.tramo_id` pasa a
  nullable, función `ve_todos_tramos()`, RLS ajustada
- **`016_registros_borrado.sql`** — política DELETE para registros + índice

**Todas están aplicadas en Supabase.** Si creas nuevas, sigue la
numeración (`017`, `018`…) y **nunca edites una ya aplicada**.
---

## 6. Convenciones y trampas ya pisadas

> **Esta sección es la que más tiempo te va a ahorrar.** Cada punto es un
> error que ya se cometió en el proyecto y costó tiempo arreglar.

### 6.1 NUNCA reescribas `app/globals.css` entero

El `globals.css` tiene más de 4.000 líneas y **el desarrollador le ha metido
mano** con arreglos propios que no están documentados. Si lo reescribes, se
pierden.

**Cómo se trabaja el CSS en este proyecto:** entregas los estilos nuevos en
un **archivo `.css` aparte** y el desarrollador **pega el contenido al final
de su `globals.css`**. Así, por orden de cascada, gana lo nuevo.

Bloques ya pegados al final, en este orden: fase 2, fase 2b, fix
formularios, `ff-form`, `ff-form-extra`, acceso, fix selector acceso, fix
ancho formularios, fase 3a, fase 3b, fase 3c, fase 3d, suscripciones.

### 6.2 Guerra de especificidad: usa clases propias con prefijo

El `globals.css` tiene reglas antiguas muy genéricas (`.field input` en la
línea ~809, `.field textarea` en la ~2485) que **pisan los estilos nuevos**.
Se perdieron varios intentos peleando con esto.

**La solución que funcionó:** darle a cada bloque nuevo su propio prefijo de
clase, que no herede de nada:

| Prefijo | Para qué |
|---|---|
| `.ff-*` | Formularios del admin (`ff-form`, `ff-sec`, `ff-pill`, `ff-switch`) |
| `.al-*` | Área del alumno (inicio) |
| `.marca-*` | Formulario de marcas |
| `.hist-*` | Historial de marcas |
| `.susc-*` | Suscripciones |
| `.cuest-*` | Cuestionario inicial |
| `.acceso-*` | Selector de acceso por planes |

Si tienes que ganar a una regla vieja, sube la especificidad con el
contenedor (`.acceso-box .acceso-check`) antes de recurrir a `!important`.

### 6.3 El patrón `ff-form` para formularios del admin

Los formularios del panel usan una estructura de **secciones numeradas** con
columna lateral. Se llegó a ella porque los formularios "planos" no
convencían al cliente. Si creas un formulario nuevo en el admin, **sigue
este patrón** para que todo sea coherente:

```tsx
<form action={accion} className="ff-form">
  <section className="ff-sec">
    <div className="ff-sec-side">
      <span className="ff-sec-num">01</span>
      <div>
        <h3>Identidad</h3>
        <p>Una línea explicando qué va aquí.</p>
      </div>
    </div>
    <div className="ff-sec-body">
      <div className="ff-field ff-field-hero">   {/* campo protagonista */}
        <label htmlFor="nombre">Nombre</label>
        <input type="text" id="nombre" name="nombre" required />
      </div>
      <div className="ff-row">                   {/* 2 columnas */}
        <div className="ff-field">…</div>
        <div className="ff-field">…</div>
      </div>
    </div>
  </section>
  {/* … más secciones … */}
  <div className="ff-acciones">
    <button type="submit" className="ff-guardar">Guardar</button>
  </div>
</form>
```

Extras del patrón: **pastillas toggle** (`.ff-pills` + `.ff-pill` con
`<button type="button">` + inputs ocultos, **no** checkboxes),
**interruptor** (`.ff-switch`) y **zona de borrado** (`.ff-peligro`).

### 6.4 El "shell" obligatorio de las páginas del alumno

**Toda** página del área del alumno debe llevar esta estructura. Si te la
saltas, la página sale suelta y sin navegación (ya pasó dos veces):

```tsx
<div className="app">
  <aside className="sidebar">
    <div>
      <div className="brand">FÍSICA<span className="accent">.</span>ELITE</div>
      <div className="brand-sub">Área del alumno</div>
    </div>
    <NavAlumno noLeidos={noLeidos} />
    <div className="sidebar-foot">
      <div className="avatar">{iniciales}</div>
      <div>
        <div className="who">{nombreCompleto}</div>
        <BotonLogout variante="texto" />
      </div>
    </div>
  </aside>
  <main className="main">
    <div className="topbar-movil">
      <div className="topbar-movil-marca">FÍSICA<span className="accent">.</span>ELITE</div>
      <BotonLogout variante="icono" />
    </div>
    {/* contenido */}
  </main>
</div>
```

**La `topbar-movil` no es opcional:** sin ella, en móvil el alumno no puede
cerrar sesión.

### 6.5 SIEMPRE `<NavAlumno />`, nunca un `<nav>` a mano

La página de chat tenía su propio `<nav>` copiado, y cuando se añadieron
secciones nuevas al menú, **en el chat no aparecían**. Ya está arreglado.

Si añades una sección al área del alumno, **se toca solo
`components/NavAlumno.tsx`**. Secciones actuales: Inicio · Mi progreso ·
Chat · Suscripción · Mi perfil.

### 6.6 La ruta del ejercicio es `[slug]`, NO `[id]`

Existe `app/ejercicio/[slug]/page.tsx`. Si creas `app/ejercicio/[id]/`,
**Next se niega a arrancar** con este error:

```
You cannot use different slug names for the same dynamic path ('id' !== 'slug')
```

Pasó y tumbó el entorno de desarrollo. Los enlaces van a
`/ejercicio/${e.slug}`.

### 6.7 La seguridad del vídeo: no la rompas

En `app/ejercicio/[slug]/page.tsx` el orden importa:

1. Se pide el ejercicio con el **cliente normal** → la RLS decide si este
   alumno puede verlo.
2. **Solo si la RLS devolvió la fila** se genera la URL firmada de Bunny.
3. Si no hay fila → `notFound()`, y nunca se firma ningún token.

**No muevas la firma antes de la comprobación** ni uses `createAdminClient()`
en esa página: sería regalar los vídeos de pago.

### 6.8 Cuidado al quitar columnas: quedan restos por el código

Al eliminar `nivel` y `especialidad` de `ejercicios` en la v2, quedaron
consultas rotas por sitios que **no daban error visible**:

- El chat del admin pedía `nivel` → la consulta fallaba → `notFound()` →
  **404 al abrir cualquier conversación**.
- La navegación anterior/siguiente de la ficha filtraba por `especialidad`
  y `nivel` → la consulta fallaba → **los botones no salían nunca**, sin
  error en pantalla.

**Lección:** cuando quites una columna, busca su nombre por todo el
proyecto (`grep -rn "nivel" app components lib`) y revisa **todos** los
`.select()`, no solo los que dan error.

### 6.9 Variables de entorno en Vercel

- Hay que ponerlas en **los tres entornos** (Production, Preview,
  Development).
- Las `NEXT_PUBLIC_*` se **incrustan en el build**: si añades o cambias
  una, hay que **redesplegar** (y en algunos casos "Clear cache and
  deploy").
- Si faltan las de Supabase, el error es `MIDDLEWARE_INVOCATION_FAILED`.

### 6.10 Next 16: `proxy.ts`, no `middleware.ts`

El proyecto se subió a **Next 16** el 17/08/2026. En Next 16 el fichero
`middleware.ts` pasa a llamarse **`proxy.ts`** y corre en **runtime
Node.js** (antes era edge). Ya está migrado con el codemod oficial:

```
npx @next/codemod@latest middleware-to-proxy .
```

(Ojo: el transform se llama `middleware-to-proxy`, no
`rename-middleware-to-proxy` como dice alguna guía. Y el codemod se niega a
funcionar si tienes cambios de git sin commitear.)

**Qué hace `proxy.ts`** (no lo rompas, es la seguridad del acceso):
1. Refresca la sesión de Supabase.
2. Si `must_change_password` → a `/cambiar-password`.
3. Si es alumno y `cuestionario_completado = false` → a `/bienvenida`.
4. `/admin/*` solo si `rol = 'admin'`, si no → `/inicio`.
5. Sin sesión en ruta privada → `/login`.
6. Con sesión en `/login` → a su inicio según rol.

**Optimización importante que hay dentro:** si no hay cookie de sesión
(`sb-*-auth-token`), el proxy sirve la página **sin llamar a Supabase**.
Esto se hizo porque la web pública tardaba 20 segundos en cargar para
visitantes anónimos. **No lo quites.**

### 6.11 Supabase gratuito se pausa

Si el proyecto está unos días sin actividad, Supabase lo pausa y todo falla
con `fetch failed` (el `npm run dev` arranca pero nada funciona). Se
restaura desde el dashboard de Supabase con un botón.

Hay un GitHub Action (`.github/workflows/keepalive.yml`) que hace un ping
diario. Necesita dos secrets en el repo: `SUPABASE_URL` y
`SUPABASE_ANON_KEY`.

### 6.12 Otros detalles que se han descubierto por las malas

- **Astro scoped styles** no aplican a DOM inyectado por JS (esto es de
  otro proyecto del mismo desarrollador, pero por si aparece código
  compartido).
- Para probar en móvil desde local: `npm run build` + `npm run start`. El
  `npm run dev` sobre WiFi sirve sin CSS y se ve todo amontonado.
- **El build de Vercel es la prueba real.** Que funcione en `dev` no
  garantiza nada; ha habido dos veces que el build falló por cosas que en
  dev iban bien.
- Al descomprimir ZIPs en Windows, cuidado con la carpeta contenedora:
  hay que arrastrar **el contenido**, no la carpeta.

---

## 7. Cómo trabajar en este proyecto

> Esta sección va dirigida al agente de Claude que va a escribir el código.

### 7.1 Metodología que ha funcionado

1. **Piezas pequeñas y probables.** Nada de "te hago las 3 fases de
   golpe". Una pieza = un cambio coherente que se puede probar en 10
   minutos.
2. **Cada pieza se entrega como un ZIP** con:
   - Los archivos en su ruta relativa (`app/…`, `components/…`, `lib/…`)
   - El CSS **en un archivo aparte** (nunca `globals.css` completo)
   - Las migraciones en `migraciones/0XX_*.sql`
   - Un **`.md` con instrucciones**: qué copiar, qué sobrescribe, qué
     migración aplicar y una **checklist de qué probar**
3. **Verifica los tipos antes de entregar.** El proyecto no se compila en
   el entorno del asistente, así que se hace un type-check aislado con un
   `tsconfig.json` temporal y stubs de los módulos (`react`, `next/*`,
   `@/lib/*`). Errores del tipo "Cannot find module" o "implicitly any" son
   falsos positivos esperables; lo que se busca son errores de sintaxis y
   de tipos reales. **Esto ha pillado varios errores antes de que llegaran
   al desarrollador.**
4. **No inventes el contenido de archivos que no has visto.** Si necesitas
   modificar un archivo del proyecto que no está en el contexto,
   **pídeselo**. Se perdió tiempo reconstruyendo de memoria archivos que
   luego no coincidían.
5. **Pregunta antes de las decisiones de producto.** Las que afectan al
   modelo de datos o a lo que ve el alumno, siempre. Se han evitado varios
   rehaces así.

### 7.2 Cómo comunicarse con el desarrollador

- **Español informal (tuteo)**, directo y conciso.
- Bloques de código y comandos claros, que se puedan copiar.
- Cuando algo "se ve mal", **preguntar qué concretamente** antes de
  ponerse a cambiar CSS. En este proyecto "se ve mal" ha significado casi
  siempre **"está plano, sin jerarquía visual"**, no un bug. La solución
  fue estructura de diseño (secciones, jerarquía de tamaños), no más CSS
  suelto.
- Los ZIPs van a `/mnt/user-data/outputs` y se presentan con la
  herramienta de archivos.

### 7.3 Reglas de seguridad al escribir código

Dado que la seguridad es la prioridad del cliente:

- **`createAdminClient()` (service_role) solo en servidor**, y solo cuando
  de verdad hace falta saltar la RLS (crear usuarios, operaciones de
  admin). Nunca en un componente cliente ni en una página que sirva datos
  a un alumno.
- **Toda tabla nueva lleva RLS.** Sin excepción. Y se prueba: entrar como
  alumno y comprobar que no ve lo que no debe.
- **Toda server action empieza con `exigirUsuario()` o `exigirAdmin()`.**
- Las claves de API (`BUNNY_*`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`) **solo en variables de servidor**, nunca con prefijo
  `NEXT_PUBLIC_`.
- Al tocar la RLS de `ejercicios`, **prueba con un alumno real** que solo
  ve lo suyo. Es la tabla que protege el producto de pago.
---

## 8. Qué está HECHO (y probado)

### 8.1 Versión 1 (completa y en producción en Vercel)

- **Autenticación** con Supabase: login, cambio de contraseña obligatorio
  en el primer acceso, protección de rutas por rol.
- **Panel de admin**: dashboard con métricas y Chart.js, CRUD de
  ejercicios con vídeo de Bunny y FAQs, gestión de alumnos, bandeja de
  chat, solicitudes de pago.
- **Área del alumno**: sus ejercicios, ficha con vídeo protegido, pestañas
  de técnica/errores/variantes/mejoras, marcar como completado, chat en
  tiempo real con badge de no leídos.
- **Alta manual de alumnos** con la Admin API: genera contraseña segura,
  la muestra una sola vez en un modal, y hace rollback si falla la
  creación del perfil.
- **Stripe** en modo test: checkout, webhook, solicitudes.
- **Bunny Stream** con URLs de embed firmadas.
- **Web pública**: home, sobre nosotros, instalaciones, contacto (con
  honeypot antispam), menú overlay a pantalla completa en móvil, SEO con
  Open Graph.
- **Despliegue en Vercel** funcionando, con la región de Frankfurt y la
  optimización del proxy para visitantes anónimos.

### 8.2 Versión 2 — el rebuild del modelo (todo hecho y probado)

Tras una reunión con el cliente se cambió el modelo: **fuera los niveles
(iniciado/avanzado/profesional), entran categorías + tramos + planes.**

| Pieza | Estado |
|---|---|
| Migración `014` — modelo nuevo | ✅ Aplicada |
| Admin: categorías y tramos (con editor inline de tramos) | ✅ |
| Admin: planes y precios (editables por el cliente) | ✅ |
| Admin: ejercicios v2 (categoría + tramo + oposiciones) | ✅ |
| Rediseño de los formularios del admin (patrón `ff-form`) | ✅ |
| Admin: ficha de alumno y alta manual sin `nivel` | ✅ |
| Selector de acceso por planes en el alta manual | ✅ |
| Migración `015` — desbloqueo total de tramos | ✅ Aplicada |
| Cuestionario inicial del alumno (asigna tramo automático) | ✅ |
| Perfil del alumno (peso, altura, facilidades) | ✅ |
| Área del alumno v2 (ejercicios por categoría y tramo) | ✅ |
| Migración `016` — borrado de registros | ✅ Aplicada |
| Registro de marcas ("Mi progreso" + historial) | ✅ |
| Registro al marcar el ejercicio como completado | ✅ |
| Gestor de suscripciones en la ficha del alumno | ✅ Recién hecho |
| Keepalive de Supabase + migración a Next 16 / `proxy.ts` | ✅ |

**Detalles del cuestionario inicial** (por si hay que tocarlo):
- Pregunta solo por las categorías que el alumno tiene **contratadas**.
- El control se adapta a la **métrica** de la categoría: slider para
  repeticiones/distancia/peso (más = mejor), campo numérico para tiempo
  (menos = mejor). La unidad sale de la BBDD.
- Tope del slider = `valor_max` del tramo más alto **+ 50%**.
- **El alumno no ve qué tramo se le asigna**, solo responde su marca.
- Si la marca **no encaja en ningún tramo** → se le desbloquean **todos**
  los tramos de esa categoría (`alumno_tramos.tramo_id = NULL`) y elige él.
- Obligatorio la primera vez; repetible después desde `/perfil`.

**Detalles del registro de marcas:**
- El formulario se adapta a la métrica igual que el cuestionario.
- **Parciales por 100 m** solo en categorías de **tiempo y distancia**
  (carrera). Se guardan en `series` (jsonb).
- Se puede apuntar desde dos sitios: al **completar un ejercicio** (se
  despliega ahí mismo) y desde **"Mi progreso"** para entrenamientos
  sueltos.
- El preparador ve las marcas de cada alumno en su ficha (solo lectura).

---

## 9. Qué FALTA — y esto es lo que hay que entregar

> ⚠️ **Del 18 de agosto. Ya hecho:** 9.1, 9.2, 9.3, 9.5 (falta solo producción),
> 9.6 (rebranding y web pública), 9.7 (Pruebas reales). **Sigue abierto:** 9.4 y
> 9.8. El estado real está en la sección 0 bis.

> Ordenado por prioridad real. Los puntos 9.1 a 9.4 son **correcciones
> pendientes que el cliente ya ha señalado**: hay que hacerlas sí o sí.

### 9.1 La especialidad NO debe ser obligatoria ⚠️ P0

**El problema:** el alta manual (`app/admin/alumnos/nuevo/page.tsx`) pide
la **especialidad como campo obligatorio** (`required`), y el editor de la
ficha también la trata como principal.

**Por qué está mal:** el cliente ha dejado claro que un alumno **puede
prepararse solo por categorías** (plan Dominadas, plan Carrera, plan
completo) **sin apuntarse a ninguna oposición**. Obligar a elegir Policía o
Guardia Civil no tiene sentido para ese perfil.

**Qué hacer:**
- Quitar el `required` de la especialidad en el alta.
- Añadir una opción explícita tipo *"Sin oposición / solo entrenamiento"*.
- Revisar la validación del servidor
  (`app/admin/alumnos/nuevo/actions.ts`): debe aceptar especialidad vacía y
  guardar `null`.
- Revisar todos los sitios donde se pinta la especialidad para que no
  quede un hueco raro cuando sea `null` (lista de alumnos, ficha,
  cabecera del chat del admin, dashboard).
- La columna `profiles.especialidad` **ya es nullable**, así que no hace
  falta migración.

### 9.2 El perfil del alumno debe mostrar su suscripción ⚠️ P0

**Ahora mismo** `/perfil` solo tiene peso, altura y facilidades.

**Qué debe mostrar además:** qué tiene pagado y a qué está suscrito — los
planes activos con su nombre, hasta cuándo le llega el acceso y qué le
cubre cada uno. Es información que el alumno pide constantemente.

Se puede reutilizar la consulta del gestor de suscripciones
(`app/admin/alumnos/[id]/page.tsx`), pero **en solo lectura y sin acciones
de admin**.

### 9.3 La página `/suscripcion` necesita todas las opciones ⚠️ P0

**Ahora mismo** solo permite "volver a pagar" (renovar lo que ya tenía).

**Qué debe permitir:**
- Ver sus suscripciones actuales y cuándo vencen.
- **Contratar planes nuevos** (un curso suelto más, la preparación
  completa, un plan de oposición).
- Renovar/ampliar los que ya tiene.
- Ver los precios reales de la BBDD.

Esto **está muy ligado a la Fase 5 (pagos)**: conviene hacerlas juntas,
porque contratar un plan nuevo implica pasar por Stripe.

### 9.4 🔴 CRÍTICO: separar contenido de oposición del contenido individual

**Este es el punto más importante que queda, y hay que resolverlo ANTES de
montar los pagos.**

**El problema:** ahora mismo un plan de tipo `completo` da acceso a **todos
los ejercicios**, incluidos los que están marcados para oposiciones. Es
decir, alguien que compre el "pack completo individual" (más barato)
obtiene por la puerta de atrás **todo el contenido de las oposiciones**,
que es lo que se vende más caro.

**Lo que quiere el cliente:** que haya dos mundos de contenido separados:

1. **Contenido de oposición** → solo visible para quien tenga un plan de
   esa oposición concreta.
2. **Contenido de categorías sueltas / general** → lo que ve quien compra
   planes individuales o el pack completo individual.

**Dónde está el problema en el código:** en la función de Postgres
`cubierto_por_plan(ejercicio_id, categoria_id)` y en la RLS de
`ejercicios`. La lógica actual de `tipo = 'completo'` devuelve `true` para
todo. También en `lib/acceso.ts`, donde `categoriasContratadas()` para un
plan completo devuelve **todas** las categorías activas.

**Tres formas de resolverlo (hay que elegir UNA y hacerla bien):**

**Opción A — Por marca de oposición del ejercicio (recomendada).**
La regla sería: si un ejercicio **tiene filas en `ejercicio_oposiciones`**,
es contenido de oposición y solo lo ve quien tenga un plan de una de esas
oposiciones. Si **no tiene ninguna**, es contenido general y lo cubren los
planes de categoría y el completo.
- ✅ Usa la estructura que ya existe, sin columnas nuevas.
- ✅ El cliente ya marca las oposiciones al crear un ejercicio.
- ⚠️ Hay que revisar los ejercicios ya creados: los que estén marcados
  para oposiciones dejarán de verse con el plan completo (que es lo que se
  busca, pero hay que avisar al cliente).

**Opción B — Campo `ambito` en las categorías.**
Añadir a `categorias_ejercicio` un campo `ambito` ('general' |
'oposicion'), y que los planes completos solo cubran las de ámbito
'general'.
- ✅ Muy explícito y fácil de entender para el cliente.
- ⚠️ Requiere migración y decidir el ámbito de cada categoría existente.
- ⚠️ Menos flexible: una categoría no puede tener ejercicios de los dos
  tipos.

**Opción C — Dos tipos de plan completo.**
Separar `completo` en `completo_individual` (solo categorías sueltas) y
`completo_total` (todo).
- ⚠️ Requiere migración del enum y no resuelve por sí sola qué contenido
  es "de oposición": necesita combinarse con A o B.

**Mi recomendación: Opción A**, porque no toca el esquema y encaja con cómo
ya trabaja el cliente. Pero **hay que confirmarlo con el cliente antes de
implementarlo**, porque cambia qué ve cada alumno que ya está dado de alta.

**Al implementarlo hay que tocar:**
- La función `cubierto_por_plan()` en una migración nueva (`017`).
- La política RLS de `ejercicios` (o dejarla igual si la función lo
  resuelve todo).
- `lib/acceso.ts` → `categoriasContratadas()`, para que el cuestionario y
  "Mi progreso" no ofrezcan categorías que en realidad no cubre su plan.
- **Probar a fondo** con tres alumnos de prueba: uno con plan suelto, uno
  con completo, uno con plan de oposición.

### 9.5 Fase 5 — Pagos v2 (P0, sin esto el cliente no cobra)

Lo que hay: checkout de Stripe en **modo test** con un precio fijo,
heredado de la v1.

Lo que falta:
- Checkout **por plan**, cogiendo el precio de `planes.precio_centimos`.
- Que el webhook cree la **suscripción con su `plan_id`** correcto.
- Poder comprar **varios planes** (carrito sencillo o compras sucesivas).
- **Crear el webhook en el panel de Stripe** apuntando a
  `https://<dominio>/api/webhooks/stripe` y meter el `whsec_` nuevo en las
  variables de Vercel. Ojo: `stripe listen` local **no** llega a Vercel.
- Pasar Stripe a **modo real** (claves de producción) al lanzar.
- Opcional (anotado por el cliente): **reembolso automático** al rechazar
  una solicitud. Ahora mismo, al rechazar solo se marca en la BBDD; el
  dinero **ya está cobrado** y el admin tiene que devolverlo a mano desde
  el panel de Stripe (y la comisión original no se recupera).

### 9.6 Fase 6 — Rebranding + web pública v2 (P0 parcial)

**El rebranding es imprescindible:** ahora mismo **toda la interfaz dice
"Física Élite"** (singular) y el cliente confirmó que es **"Físicas
Élite"** (plural). Hay que cambiarlo en todos lados: sidebars, títulos,
metadatos, textos de la web pública, emails.

**Paleta nueva**, extraída del logo que entregó el cliente
(`/mnt/user-data/uploads/1784150421222_image.png` en la sesión original —
pedidle el logo a Saúl):

| Color | Hex | Uso |
|---|---|---|
| Negro verdoso | `#030E0A` | Fondo / textos (no es negro puro) |
| Dorado ocre | `#C09D39` | Acento |
| Blanco hueso | `#FFFFF0` | Fondo claro / textos sobre oscuro |

La paleta actual es crema/tinta/rojo (`--bg: #F2EFE8`, `--accent: #E0431D`)
con tipografías Syne/Manrope/Instrument Serif. **Si se cambian las
variables CSS de `:root`, gran parte del rebranding se propaga solo** —
esa es la vía rápida.

**Web pública v2, lo que pidió el cliente:**
- Hero con el logo y **foto de las instalaciones de fondo** (las fotos son
  verticales; hay que maquetar dejando hueco).
- **Páginas de detalle por oposición**, con color propio por cuerpo (verde
  Guardia Civil, azul Policía Nacional, etc.).
- Planes desglosados con sus precios reales.
- Enlazar las tarjetas de la home a la página de precios.
- Sección de reseñas.
- Enlace "volver al inicio" en `/login`.
- Emblemas de los cuerpos visibles dentro de la plataforma, por categoría.
- **Aduanas** aparece como 5ª oposición pero marcada "próximamente".

**Páginas legales (P0 legal):** `aviso-legal` y `privacidad` están
**empezadas con placeholders** (`[NIF POR COMPLETAR]`, etc.) y **falta la
de cookies con su banner**. Hay que terminarlas con los datos fiscales
reales del cliente y con el nombre correcto. Sin esto no se puede lanzar
legalmente (RGPD/LOPDGDD). Los encargados de tratamiento a listar:
Supabase, Vercel, Stripe, Bunny y Resend.

### 9.7 Fase 4 — Evaluaciones con vídeo (P1, se puede posponer)

El cliente lo pidió: **cada 6 semanas** el alumno sube un vídeo haciendo
las pruebas reales, con calidad suficiente para que el preparador corrija
la técnica. Se guardan por **fecha de examen**.

La tabla **`evaluaciones` ya existe** (creada en la migración 014, sin
usar): `user_id, video_id, fecha_examen, estado ('pendiente'|'revisada'),
feedback`.

Lo que falta: subida de vídeo del alumno a Bunny, listado para el
preparador, y la pantalla de corrección con feedback.

**Mi opinión honesta:** con 14 días y todo lo anterior por delante, **esta
es la primera candidata a posponer** para una segunda entrega. Hay que
hablarlo con el cliente, pero el producto es lanzable sin ella.

### 9.8 Puesta en producción (P0, el último día)

- [ ] Comprar el **dominio** y configurar DNS
- [ ] Subir Supabase a **Pro** (~25 $/mes) — backups y sin pausas
- [ ] **Verificar el dominio en Resend** y activar los emails
      (notificaciones de pago, avisos). Hay una constante `MODO_PRUEBAS`
      que hay que poner a `false`
- [ ] Stripe en **modo real** + webhook de producción
- [ ] Variables de entorno de producción en Vercel (los tres entornos)
- [ ] Revisar que **no queda ninguna clave secreta con prefijo
      `NEXT_PUBLIC_`**
- [ ] Probar el flujo completo con un pago real de 1 €
- [ ] Dar de alta a los ~75 alumnos del cliente (o preparar una
      importación)

### 9.9 Otros pendientes menores anotados

- Reasignar el tramo de un alumno a mano desde el admin (el cliente lo
  pidió: "reasignable por admin"). Ahora solo se asigna por el
  cuestionario.
- El dashboard sigue mostrando métricas pensadas para la v1; conviene
  revisarlo con el modelo nuevo.
---

## 10. Plan propuesto para llegar al 1 de septiembre

> ⚠️ **Histórico.** El plan ya se ejecutó; no lo sigas. Ver la sección 0 bis.

Hoy es **18 de agosto**. Quedan **14 días**. Este plan asume que Pedro
puede dedicarle bastantes horas; si no, hay que recortar por el final (ver
10.1).

### Bloque 1 · Días 1-3 (18-20 ago) — Desatascar el modelo de acceso

**Lo primero, porque todo lo demás depende de esto.**

1. **Hablar con el cliente** para confirmar cómo quiere la separación
   oposición / individual (sección 9.4). Sin esta respuesta no se puede
   avanzar bien. Llevar preparadas las tres opciones.
2. Implementar la separación elegida: migración `017`, función
   `cubierto_por_plan`, `lib/acceso.ts`.
3. Probar con **tres alumnos de prueba** (plan suelto / completo /
   oposición) que cada uno ve exactamente lo que debe.
4. Quitar la obligatoriedad de la especialidad (9.1).

### Bloque 2 · Días 4-6 (21-23 ago) — Pagos

5. Checkout por plan con precios de la BBDD (9.5).
6. Webhook que crea la suscripción con su `plan_id`.
7. Rehacer `/suscripcion` con todas las opciones (9.3).
8. Mostrar la suscripción en `/perfil` (9.2).
9. Probar el flujo completo en modo test **desde la URL de Vercel** (hay
   que crear el webhook en el panel de Stripe apuntando a Vercel).

### Bloque 3 · Días 7-9 (24-26 ago) — Rebranding

10. Cambiar **"Física Élite" → "Físicas Élite"** en todo el proyecto.
11. Aplicar la paleta nueva en las variables de `:root` y revisar
    pantalla por pantalla.
12. Terminar las **páginas legales** con los datos fiscales reales +
    cookies con banner.

### Bloque 4 · Días 10-12 (27-29 ago) — Web pública v2

13. Hero con logo y foto de instalaciones.
14. Páginas por oposición con color propio.
15. Precios desglosados enlazados desde la home + reseñas.

### Bloque 5 · Días 13-14 (30-31 ago) — Producción

16. Dominio + DNS, Supabase Pro, Resend verificado, Stripe en real.
17. Pruebas de extremo a extremo con un pago real.
18. Alta de los alumnos del cliente.

### 10.1 Si no se llega: qué recortar y en qué orden

1. **Fase 4 (evaluaciones con vídeo)** — ya está fuera del plan. Segunda
   entrega.
2. **Sección de reseñas** de la web pública — se añade después.
3. **Páginas por oposición con colores propios** — se puede lanzar con una
   sola página de precios bien hecha.
4. **Rediseño completo de la web pública** — el rebranding de nombre y
   colores es obligatorio, pero el hero con foto y la maquetación nueva
   pueden esperar.

**Lo que NO se puede recortar bajo ningún concepto:**
- La separación de contenido de oposición (9.4) — es el modelo de negocio.
- Los pagos funcionando (9.5).
- El nombre correcto "Físicas Élite".
- Las páginas legales (RGPD).
- Supabase Pro y las claves en modo real.

### 10.2 Conversación pendiente con el cliente

Hay que preguntarle, cuanto antes:

1. **¿Cómo separamos el contenido de oposición del individual?** (9.4) —
   la más urgente.
2. **¿Las evaluaciones con vídeo son imprescindibles para el día 1**, o
   pueden ir en una segunda entrega?
3. **Datos fiscales** para las páginas legales (nombre/razón social, NIF,
   dirección, email de contacto).
4. **El logo** en alta resolución y las **fotos de las instalaciones**.
5. **Confirmar los precios definitivos** de cada plan.
6. ¿Qué dominio quiere?

---

## 11. Prompt de arranque para el Claude de Pedro

> Copia esto tal cual en tu primera conversación con Claude, junto con este
> manual entero.

```
Voy a continuar un proyecto web que estaba desarrollando mi compañero Saúl
y que tengo que entregar el 1 de septiembre de 2026.

Te paso el manual completo del proyecto (léelo entero antes de proponer
nada). Es una plataforma de preparación física para oposiciones, hecha con
Next.js 16 + TypeScript + Supabase + Stripe + Bunny Stream, desplegada en
Vercel.

Cómo quiero que trabajemos:

- Piezas pequeñas y probables, no cambios enormes de golpe.
- Cada pieza me la das como un ZIP con los archivos en su ruta, el CSS en
  un archivo APARTE (nunca globals.css completo), las migraciones SQL
  numeradas, y un .md con qué copiar y qué probar.
- Verifica los tipos antes de darme nada.
- Si necesitas ver un archivo del proyecto que no tienes, PÍDEMELO. No lo
  reconstruyas de memoria.
- Antes de decisiones que afecten al modelo de datos o a lo que ve el
  alumno, pregúntame.
- Háblame en español, tuteo, directo y sin rodeos.
- La prioridad del cliente es la SEGURIDAD: nada de filtraciones de datos
  ni de contenido de pago.

Lo primero que necesito de ti: leer el manual y decirme por dónde
empezamos, teniendo en cuenta que el punto 9.4 (separar el contenido de
oposición del individual) es el que bloquea a los demás.
```

---

## 12. Anexo A — Accesos y credenciales que hay que pedirle a Saúl

- [ ] Acceso al repo **GitHub ContactoExtreweb/Fisica-Elite** (o
      transferencia)
- [ ] Acceso al proyecto de **Supabase** (invitar a Pedro como miembro)
- [ ] Acceso a **Vercel** (invitar al proyecto)
- [ ] Acceso a **Stripe** (modo test y luego real)
- [ ] Acceso a **Bunny Stream**
- [ ] Acceso a **Resend**
- [ ] El archivo **`.env.local`** completo (nunca por email/chat público;
      mejor un gestor de contraseñas o en persona)
- [ ] El **logo** de Físicas Élite en alta resolución
- [ ] El documento **`Cambios Fisica Elite.txt`** que está en la raíz del
      proyecto (son las peticiones del cliente en su reunión)
- [ ] Las **fotos de las instalaciones**, si las tiene ya
- [ ] El **contacto directo del cliente**, para las preguntas de 10.2

## 13. Anexo B — Variables de entorno necesarias

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        ← SECRETA, solo servidor

# Stripe
STRIPE_SECRET_KEY=                ← SECRETA
STRIPE_WEBHOOK_SECRET=            ← SECRETA (whsec_…), distinta en local y en Vercel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Bunny Stream
BUNNY_STREAM_LIBRARY_ID=          ← (los nombres REALES son estos, con STREAM: lib/bunny.ts)
BUNNY_STREAM_API_KEY=             ← SECRETA. También firma el sello de las subidas de pruebas
BUNNY_STREAM_TOKEN_KEY=           ← SECRETA (firma de los embeds)

# Resend
RESEND_API_KEY=                   ← SECRETA
EMAIL_FROM=                       ← "Físicas Élite <avisos@dominio>" (sin dominio verificado,
                                    solo vale <onboarding@resend.dev>)
EMAIL_PRUEBAS_A=                  ← SOLO en pruebas: desvía TODOS los correos a esta
                                    dirección. En producción se BORRA.

# Tarea diaria de avisos por inactividad (Vercel Cron)
CRON_SECRET=                      ← SECRETA. Sin ella el endpoint /api/cron/inactividad
                                    responde 401 a todo el mundo.

# Asistente virtual (chatbot). Opcional: sin estas variables no se muestra.
# Migración 029 aplicada antes de activarlo (límites de uso). Ver lib/asistente/.
NEXT_PUBLIC_ASISTENTE=on          ← interruptor del botón y de lo que dice la privacidad
                                    (se incrusta en el build: redesplegar al cambiarla)
ASISTENTE_API_URL=                ← base de una API tipo OpenAI, sin la ruta final
                                    (Mistral: https://api.eu.mistral.ai/v1, el de la UE)
ASISTENTE_API_KEY=                ← SECRETA
ASISTENTE_MODEL=                  ← nombre del modelo, tal como lo llama el proveedor

# App
NEXT_PUBLIC_SITE_URL=             ← cambia al poner el dominio real
```

Recuerda: **las `NEXT_PUBLIC_*` viajan al navegador**. Nada secreto ahí.
Y hay que ponerlas en los tres entornos de Vercel.

## 14. Anexo C — Comandos útiles

```bash
# Desarrollo
npm run dev

# Probar de verdad (y para ver en el móvil por la red local)
npm run build && npm run start

# Buscar restos de columnas eliminadas antes de dar algo por bueno
grep -rn "nivel" app components lib
grep -rn "especialidad" app components lib

# Migración de middleware a proxy (ya hecha, por si acaso)
npx @next/codemod@latest middleware-to-proxy .
```

Las **migraciones SQL** se aplican a mano en el **SQL Editor de Supabase**,
en orden numérico. Ejecuta en transacción: si falla, rollback limpio.

---

## 15. Resumen en cinco líneas

1. El proyecto está al **~65%**: modelo de datos v2, panel de admin y área
   del alumno **funcionando**.
2. Falta: **separar el contenido de oposición del individual** (bloquea
   todo), **pagos por plan**, **rebranding a "Físicas Élite"**, **web
   pública v2** y **legales**.
3. La **seguridad es la prioridad** del cliente, y la protege la **RLS de
   Supabase**, no el código de la app.
4. **CSS en archivos aparte**, clases con prefijo propio, y **nunca**
   reescribir `globals.css`.
5. Antes de tocar nada, leer las secciones **6 (trampas)** y **9.4 (el
   problema del acceso)**.

**Suerte. El proyecto está en buen estado; lo que queda está acotado y
documentado.**
