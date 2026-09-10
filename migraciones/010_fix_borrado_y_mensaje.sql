-- ============================================================
--  FÍSICA ÉLITE — Migración 010 · Arreglo de borrado + mensaje
--
--  1) BUG de eliminación: mensajes.autor_id referenciaba profiles
--     SIN cascade, así que borrar un alumno que había escrito en el
--     chat quedaba bloqueado. Lo cambiamos a ON DELETE CASCADE: al
--     borrar el perfil, se borran sus mensajes.
--
--  2) Campo de texto libre del formulario de pago (nivel/dificultades)
--     para que el preparador conozca mejor al alumno.
-- ============================================================

-- 1 · Recrear la FK de mensajes.autor_id con cascade
alter table public.mensajes
  drop constraint if exists mensajes_autor_id_fkey;

alter table public.mensajes
  add constraint mensajes_autor_id_fkey
  foreign key (autor_id) references public.profiles(id) on delete cascade;

-- 2 · Mensaje libre del usuario en la solicitud
alter table public.solicitudes_alta
  add column if not exists mensaje_usuario text;
