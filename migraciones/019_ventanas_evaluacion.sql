-- ============================================================
--  FÍSICAS ÉLITE — Migración 019 · Ventanas de evaluación
--
--  POR QUÉ:
--  En la 018 el alumno podía subir su prueba cuando le tocaba según SU
--  última subida. Resultado: un goteo continuo de vídeos sueltos y unas
--  "6 semanas" que en realidad eran distintas para cada alumno.
--
--  Ahora manda el preparador: abre una VENTANA (del día X al día Y) y solo
--  dentro de ella se pueden subir pruebas. Fuera de la ventana el botón
--  está deshabilitado. Así todos se graban en el mismo periodo y las
--  correcciones llegan por tandas.
--
--  categoria_id NULL = la ventana vale para TODAS las categorías.
--  Si se rellena, la ventana es solo de esa categoría (p. ej. abrir una
--  tanda solo de natación).
-- ============================================================

create table if not exists public.ventanas_evaluacion (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  fecha_inicio  date not null,
  fecha_fin     date not null,
  categoria_id  uuid references public.categorias_ejercicio(id) on delete cascade,
  activa        boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create index if not exists idx_ventanas_fechas
  on public.ventanas_evaluacion (fecha_inicio, fecha_fin);

alter table public.ventanas_evaluacion enable row level security;

-- El alumno necesita LEERLAS para saber cuándo le toca y cuándo abre la
-- siguiente. Solo las activas; las cerradas son cosa del preparador.
create policy "ventanas: leer activas" on public.ventanas_evaluacion
  for select using ( activa or public.es_admin() );

create policy "ventanas: gestionar admin" on public.ventanas_evaluacion
  for all using ( public.es_admin() ) with check ( public.es_admin() );


-- ------------------------------------------------------------
--  COMPROBACIÓN (opcional)
-- ------------------------------------------------------------
-- select nombre, fecha_inicio, fecha_fin, categoria_id, activa
-- from public.ventanas_evaluacion order by fecha_inicio desc;

-- ============================================================
--  FIN migración 019
-- ============================================================
