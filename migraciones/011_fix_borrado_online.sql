-- ============================================================
--  FÍSICA ÉLITE — Migración 011 · Borrado de usuarios online
--
--  Los alumnos creados desde un pago ONLINE no se podían borrar:
--  solicitudes_alta.profile_creado los referencia SIN cascade y
--  bloqueaba el borrado. Lo cambiamos a ON DELETE SET NULL: al borrar
--  el alumno, la solicitud se conserva (histórico de pago) pero deja
--  de apuntar a un perfil que ya no existe.
-- ============================================================

alter table public.solicitudes_alta
  drop constraint if exists solicitudes_alta_profile_creado_fkey;

alter table public.solicitudes_alta
  add constraint solicitudes_alta_profile_creado_fkey
  foreign key (profile_creado) references public.profiles(id) on delete set null;
