-- ============================================================
--  FÍSICAS ÉLITE — Migración 034 · Avisos al alumno
--
--  Cuatro avisos nuevos (ver lib/avisos.ts):
--    · mensaje nuevo del preparador en el chat
--    · clase presencial reservada para mañana
--    · suscripción a punto de caducar
--    · prueba real corregida
--
--  Van por CORREO (Resend, ya montado) y por NOTIFICACIÓN PUSH (OneSignal).
--  El push no necesita ninguna tabla: la suscripción del navegador vive en
--  OneSignal, que identifica al alumno por su id de la plataforma
--  (external_id), y el permiso del navegador ES su consentimiento.
--
--  Aquí solo hace falta el interruptor del CORREO. Es aparte de
--  'recordatorios_email' (migración 023) a propósito: una cosa es que te
--  avisen de algo que ha pasado y otra que te insistan por no entrar.
--
--  Se puede aplicar ANTES o DESPUÉS de desplegar el código: si la columna
--  todavía no existe, lib/avisos.ts no manda nada y lo deja en el log.
-- ============================================================

alter table public.profiles
  add column if not exists avisos_email boolean not null default true;

comment on column public.profiles.avisos_email is
  'El alumno quiere los avisos por correo (mensaje del preparador, clase de mañana, fin de acceso, prueba corregida). Lo cambia él desde /perfil.';

-- COMPROBACIÓN (debe salir una fila con avisos_email = true)
select count(*) filter (where avisos_email) as con_avisos,
       count(*)                             as alumnos
from public.profiles
where rol = 'alumno';

-- ============================================================
--  FIN migración 034
-- ============================================================
