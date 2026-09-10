-- ============================================================
--  FÍSICA ÉLITE — Migración 003 · Email en profiles
--
--  El email vive en auth.users, que no es consultable desde el
--  panel con el cliente normal. Lo copiamos a profiles para
--  listados y búsquedas (patrón estándar en Supabase).
--  La RLS existente ya lo protege: solo el propio usuario o un
--  admin pueden leer el perfil.
-- ============================================================

alter table public.profiles add column if not exists email text;

-- Backfill de los usuarios ya existentes
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- El trigger de alta ahora también copia el email
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, rol, must_change_password, email)
  values (new.id, 'alumno', true, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;
