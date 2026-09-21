-- ============================================================
--  FÍSICAS ÉLITE — Migración 026 · Reseñas manuales
--
--  El cliente quiere enseñar opiniones de sus alumnos en el Inicio y en
--  "Sobre nosotros". Se cargan A MANO desde /admin/resenas (se copian de
--  Google u otro sitio): no hay integración con ninguna API externa.
--
--  · visible: el admin puede ocultar una reseña sin borrarla.
--  · orden: menor = antes. El Inicio enseña las primeras; "Sobre nosotros"
--    las enseña todas.
--  · origen: texto libre ("Google", "WhatsApp"…). Vacío = no se muestra.
--
--  RLS (como 'planes'): cualquiera puede LEER las visibles (la web pública
--  es anónima), solo el admin puede crear, editar, ocultar y borrar.
--  Nadie más puede escribir: no hay política de escritura para el resto.
-- ============================================================

create table public.resenas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 1 and 80),
  texto       text not null check (char_length(texto) between 1 and 1200),
  puntuacion  smallint not null default 5 check (puntuacion between 1 and 5),
  origen      text check (origen is null or char_length(origen) <= 40),
  visible     boolean not null default true,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_resenas_updated before update on public.resenas
  for each row execute function public.set_updated_at();

create index resenas_visibles_idx on public.resenas (orden, created_at desc) where visible;

alter table public.resenas enable row level security;

create policy "resenas: leer visibles" on public.resenas
  for select using ( visible or public.es_admin() );

create policy "resenas: gestionar admin" on public.resenas
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ============================================================
--  FIN migración 026
-- ============================================================
