-- ============================================================
--  FÍSICA ÉLITE — Migración 012 · Slug legible en ejercicios
--
--  Cambia la URL del ejercicio de un id largo a un slug legible
--  hecho desde el título, p.ej. "carrera-1000m-ritmo-de-prueba".
--  Se genera solo (trigger) si no se indica a mano, y es único.
--  La seguridad (RLS) NO cambia: seguimos filtrando por
--  especialidad, nivel y acceso; solo cambia CÓMO localizamos la fila.
-- ============================================================

-- 1 · Columna slug (de momento sin NOT NULL para poder rellenar)
alter table public.ejercicios
  add column if not exists slug text;

-- 2 · Función que convierte un texto en slug (sin tildes, minúsculas,
--     espacios y símbolos -> guiones). unaccent evita depender de la
--     extensión: hacemos la traducción manual de las vocales acentuadas.
create or replace function public.slugify(txt text)
returns text
language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(
          translate(
            coalesce(txt, ''),
            'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
            'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
          )
        ),
        '[^a-z0-9]+', '-', 'g'   -- todo lo que no sea letra/número -> guion
      ),
      '-+', '-', 'g'             -- colapsar guiones repetidos
    )
  );
$$;

-- 3 · Genera un slug ÚNICO para un ejercicio. Si el base ya existe en
--     OTRA fila, le añade -2, -3, ... hasta encontrar uno libre.
create or replace function public.slug_unico_ejercicio(base text, id_actual uuid)
returns text
language plpgsql stable as $$
declare
  candidato text;
  sufijo int := 1;
begin
  base := nullif(public.slugify(base), '');
  if base is null then
    base := 'ejercicio';
  end if;

  candidato := base;
  while exists (
    select 1 from public.ejercicios
    where slug = candidato
      and (id_actual is null or id <> id_actual)
  ) loop
    sufijo := sufijo + 1;
    candidato := base || '-' || sufijo;
  end loop;

  return candidato;
end;
$$;

-- 4 · Trigger: al insertar o actualizar, si no hay slug (o cambió el
--     título y quieres regenerarlo poniéndolo vacío), lo genera desde
--     el título, garantizando unicidad.
create or replace function public.ejercicio_set_slug()
returns trigger
language plpgsql as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.slug_unico_ejercicio(new.titulo, new.id);
  else
    -- Si viene slug a mano, lo normalizamos y aseguramos unicidad
    new.slug := public.slug_unico_ejercicio(new.slug, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ejercicio_slug on public.ejercicios;
create trigger trg_ejercicio_slug
  before insert or update on public.ejercicios
  for each row execute function public.ejercicio_set_slug();

-- 5 · Rellenar los ejercicios existentes (uno a uno para respetar la
--     unicidad incremental).
do $$
declare
  fila record;
begin
  for fila in select id, titulo from public.ejercicios where slug is null or trim(slug) = '' loop
    update public.ejercicios
      set slug = public.slug_unico_ejercicio(fila.titulo, fila.id)
      where id = fila.id;
  end loop;
end;
$$;

-- 6 · Ahora sí: único e indexado. (NOT NULL lo garantiza el trigger.)
create unique index if not exists idx_ejercicios_slug on public.ejercicios (slug);
