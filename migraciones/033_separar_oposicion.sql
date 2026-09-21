-- ============================================================
--  FÍSICAS ÉLITE — Migración 033 · Separar el contenido de oposición
--                                  del contenido suelto (punto 9.4)
--
--  Lo que decidió el cliente:
--    · Los planes de OPOSICIÓN son un producto aparte.
--    · Los planes SUELTOS van por categoría (Carrera, Dominadas…).
--    · El PACK COMPLETO incluye todo lo suelto, de todas las categorías,
--      pero NO los planes de oposición.
--    · Un mismo ejercicio puede estar en los dos mundos si el preparador
--      lo marca a mano.
--
--  Regla que queda (la aplica la RLS de 'ejercicios' a través de
--  cubierto_por_plan, sin tocar la política):
--    · Ejercicio SIN oposición marcada      → suelto: lo ven su plan de
--      categoría y el pack completo.
--    · Ejercicio CON oposición marcada      → solo lo ve quien tenga el plan
--      de esa oposición…
--    · …salvo que lleve tambien_suelto      → entonces lo ven también su plan
--      de categoría y el pack completo.
--    · Suscripción antigua sin plan (v1)    → sigue viéndolo todo (como antes).
--    · El tramo y el "publicado" se siguen aplicando igual que antes.
--
--  Además, bloqueo de las PREGUNTAS FRECUENTES de cada ejercicio: la tabla
--  ejercicio_faqs no está en ninguna migración del repositorio (se creó a
--  mano), así que no se sabe qué política tiene. Aquí se fuerza que una FAQ
--  solo la pueda leer quien puede ver su ejercicio (o el admin), sea cual sea
--  la política que tuviera antes (política RESTRICTIVA: se suma a las demás).
--
--  ⚠️ ORDEN: aplica esta migración ANTES de desplegar el código (el panel de
--  ejercicios ya lee y guarda la columna nueva). Al revés que la 031.
-- ============================================================

-- 1 · La casilla "También en planes sueltos y pack completo"
alter table public.ejercicios
  add column if not exists tambien_suelto boolean not null default false;

-- 2 · ¿Algún plan ACTIVO del alumno cubre este ejercicio? (misma firma de
--     siempre, así la política de 'ejercicios' no cambia). La fecha va en
--     horario de Madrid, como dejó la migración 032.
create or replace function public.cubierto_por_plan(e_id uuid, e_cat uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  with ej as (
    select (
      not exists (select 1 from public.ejercicio_oposiciones eo where eo.ejercicio_id = e_id)
      or coalesce((select e.tambien_suelto from public.ejercicios e where e.id = e_id), false)
    ) as es_suelto
  )
  select exists (
    select 1
    from public.suscripciones s
    left join public.planes p on p.id = s.plan_id
    cross join ej
    where s.user_id = auth.uid()
      and s.estado = 'activa'
      and s.fecha_fin >= (now() at time zone 'Europe/Madrid')::date
      and (
        -- compatibilidad v1: suscripción sin plan = acceso a todo
        s.plan_id is null
        -- pack completo: todo lo suelto, de todas las categorías
        or (p.tipo = 'completo' and ej.es_suelto)
        -- plan suelto: lo suelto de SUS categorías
        or (p.tipo = 'ejercicio'
            and ej.es_suelto
            and exists (select 1 from public.plan_categorias pc
                        where pc.plan_id = p.id and pc.categoria_id = e_cat))
        -- plan de oposición: lo marcado para ESA oposición
        or (p.tipo = 'oposicion'
            and exists (select 1 from public.ejercicio_oposiciones eo
                        where eo.ejercicio_id = e_id and eo.especialidad = p.especialidad))
      )
  );
$$;

-- 3 · Preguntas frecuentes: solo quien puede ver el ejercicio (o el admin).
--     La subconsulta a 'ejercicios' se evalúa con la RLS del propio alumno.
alter table public.ejercicio_faqs enable row level security;

drop policy if exists "faqs: leer si ve el ejercicio" on public.ejercicio_faqs;
create policy "faqs: leer si ve el ejercicio" on public.ejercicio_faqs
  for select using (
    public.es_admin()
    or exists (select 1 from public.ejercicios e where e.id = ejercicio_faqs.ejercicio_id)
  );

drop policy if exists "faqs: solo con acceso al ejercicio" on public.ejercicio_faqs;
create policy "faqs: solo con acceso al ejercicio" on public.ejercicio_faqs
  as restrictive
  for select using (
    public.es_admin()
    or exists (select 1 from public.ejercicios e where e.id = ejercicio_faqs.ejercicio_id)
  );

drop policy if exists "faqs: gestionar admin (033)" on public.ejercicio_faqs;
create policy "faqs: gestionar admin (033)" on public.ejercicio_faqs
  for all using (public.es_admin()) with check (public.es_admin());

-- COMPROBACIÓN
-- a) La función ya usa la casilla nueva (debe salir true):
select pg_get_functiondef('public.cubierto_por_plan(uuid, uuid)'::regprocedure) ~ 'tambien_suelto'
  as cubierto_por_plan_actualizada;

-- b) Políticas de las FAQ (debe aparecer una RESTRICTIVE):
select policyname, permissive, cmd
from pg_policies
where schemaname = 'public' and tablename = 'ejercicio_faqs'
order by permissive, policyname;

-- ============================================================
--  FIN migración 033
-- ============================================================
