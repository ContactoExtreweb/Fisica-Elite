-- ============================================================
--  FÍSICAS ÉLITE — Migración 015 · Desbloqueo total por categoría
--
--  Cuando el cuestionario del alumno da una marca que NO encaja en
--  ningún tramo, el cliente quiere DESBLOQUEAR TODOS los tramos de
--  esa categoría y que el propio alumno elija. Para eso:
--   · alumno_tramos.tramo_id pasa a ser NULLABLE.
--   · un tramo_id NULL en esa tabla significa "ve todos los tramos".
--   · se ajusta la RLS de ejercicios para respetarlo.
-- ============================================================

-- 1. Permitir tramo_id NULL = "todos los tramos de esta categoría"
alter table public.alumno_tramos alter column tramo_id drop not null;

-- 2. ¿El alumno tiene esta categoría en modo "todos los tramos"?
--    (existe fila para la categoría con tramo_id NULL)
create or replace function public.ve_todos_tramos(cat uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.alumno_tramos
    where user_id = auth.uid() and categoria_id = cat and tramo_id is null
  );
$$;

-- 3. mi_tramo: si está en modo "todos", devolvemos NULL (no filtra por
--    tramo). Si tiene un tramo asignado, ese. Si no tiene fila, el más
--    básico (comportamiento anterior).
create or replace function public.mi_tramo(cat uuid)
returns uuid
language sql security definer stable set search_path = public as $$
  select case
    when public.ve_todos_tramos(cat) then null
    else coalesce(
      (select tramo_id from public.alumno_tramos
        where user_id = auth.uid() and categoria_id = cat),
      (select id from public.tramos
        where categoria_id = cat order by orden asc limit 1)
    )
  end;
$$;

-- 4. RLS de ejercicios: se ve si está en modo "todos los tramos" de esa
--    categoría, O si el ejercicio no tiene tramo, O si su tramo es el del
--    alumno. (Reemplaza la política de la 014.)
drop policy if exists "ejercicios: leer segun plan y tramo" on public.ejercicios;

create policy "ejercicios: leer segun plan y tramo"
  on public.ejercicios for select
  using (
    public.es_admin()
    or (
      publicado
      and public.tiene_acceso_activo(auth.uid())
      and public.cubierto_por_plan(id, categoria_id)
      and (
        public.ve_todos_tramos(categoria_id)   -- desbloqueo total
        or tramo_id is null                     -- ejercicio sin tramo
        or tramo_id = public.mi_tramo(categoria_id)
      )
    )
  );

-- ============================================================
--  FIN migración 015
-- ============================================================
