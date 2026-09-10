-- ============================================================
--  FÍSICAS ÉLITE — Migración 014 · MODELO V2
--
--  Cambio de modelo acordado con el cliente:
--   · Fuera los niveles (iniciado/avanzado/profesional).
--   · Los ejercicios se organizan por CATEGORÍA (dominadas, carrera…)
--     y dentro de cada categoría por TRAMOS de marca (p.ej. 0-9,
--     9-12, 12-17 repeticiones; en carrera, otras métricas).
--   · El acceso se compra por PLANES: por ejercicio (una o varias
--     categorías), completo (todo) o por oposición (temática).
--     Un alumno puede tener VARIOS planes a la vez.
--   · El alumno se AUTOEVALÚA (cuestionario) y se le asigna tramo
--     por categoría; el admin puede reasignarlo. Solo ve su tramo
--     actual (no los pasados, para no estancarse).
--   · Registro diario de marcas (reps, peso, km, tiempos por 100m).
--   · Evaluaciones cada 6 semanas con vídeo del alumno.
--   · Nueva oposición: Aduanas (preparada, se mostrará "próximamente").
--
--  ⚠️ IMPORTANTE: esta migración ROMPE el área de alumno y el CRUD
--  de ejercicios ACTUALES (quita columnas y cambia la RLS). No hay
--  alumnos reales, así que es seguro, pero aplícala cuando empecemos
--  la Fase 2 (siguiente pieza), no antes, si quieres que la demo
--  actual siga funcionando mientras tanto.
-- ============================================================


-- ------------------------------------------------------------
-- 0. TIPOS NUEVOS + AMPLIACIÓN
-- ------------------------------------------------------------
create type tipo_plan as enum ('ejercicio', 'completo', 'oposicion');
create type estado_evaluacion as enum ('pendiente', 'revisada');

-- Nueva oposición (Vigilancia Aduanera). Solo se AÑADE el valor;
-- no se usa en esta migración (PG lo exige así).
alter type especialidad add value if not exists 'aduanas';


-- ------------------------------------------------------------
-- 1. CATEGORÍAS DE EJERCICIO  (dominadas, carrera, flexiones…)
--    'metrica' y 'unidad' son informativas: dicen qué se mide en
--    esta categoría (repeticiones, tiempo, distancia, peso).
-- ------------------------------------------------------------
create table public.categorias_ejercicio (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  metrica     text not null default 'repeticiones',  -- repeticiones | tiempo | distancia | peso
  unidad      text not null default 'reps',          -- reps | seg | min | km | kg
  descripcion text,
  orden       int not null default 0,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. TRAMOS por categoría  (la "gradación": 0-9, 9-12, 12-17…)
--    El ORDEN define la progresión dentro de la categoría.
-- ------------------------------------------------------------
create table public.tramos (
  id            uuid primary key default gen_random_uuid(),
  categoria_id  uuid not null references public.categorias_ejercicio(id) on delete cascade,
  nombre        text not null,          -- "0-9", "9-12"… (texto libre, lo pone el admin)
  valor_min     numeric,                -- opcional, para el auto-cálculo del cuestionario
  valor_max     numeric,
  orden         int not null default 0, -- 0 = el más básico
  created_at    timestamptz not null default now(),
  unique (categoria_id, orden)
);

-- ------------------------------------------------------------
-- 3. EJERCICIOS v2: categoría + tramo en lugar de especialidad + nivel
--    tramo_id NULL = el ejercicio se ve en TODOS los tramos de su
--    categoría (útil para técnica general).
-- ------------------------------------------------------------
alter table public.ejercicios
  add column categoria_id uuid references public.categorias_ejercicio(id),
  add column tramo_id     uuid references public.tramos(id) on delete set null;

-- Los ejercicios existentes (de prueba) se recolocan en una categoría
-- "General" con un único tramo, para no perderlos.
do $$
declare
  cat_id uuid;
  tr_id  uuid;
begin
  insert into public.categorias_ejercicio (nombre, slug, metrica, unidad, descripcion, orden)
  values ('General', 'general', 'repeticiones', 'reps', 'Categoría de transición para ejercicios antiguos', 999)
  returning id into cat_id;

  insert into public.tramos (categoria_id, nombre, orden)
  values (cat_id, 'Único', 0)
  returning id into tr_id;

  update public.ejercicios set categoria_id = cat_id where categoria_id is null;
  -- tramo_id se deja NULL: visibles en todos los tramos de General.
end $$;

alter table public.ejercicios alter column categoria_id set not null;

-- Un ejercicio puede estar marcado para VARIAS oposiciones (o ninguna).
create table public.ejercicio_oposiciones (
  ejercicio_id  uuid not null references public.ejercicios(id) on delete cascade,
  especialidad  especialidad not null,
  primary key (ejercicio_id, especialidad)
);

-- Migrar la especialidad antigua de cada ejercicio a la nueva tabla
insert into public.ejercicio_oposiciones (ejercicio_id, especialidad)
select id, especialidad from public.ejercicios where especialidad is not null
on conflict do nothing;

-- La política RLS antigua depende de estas columnas: fuera ANTES de tirarlas.
drop policy if exists "ejercicios: leer segun especialidad, nivel y acceso" on public.ejercicios;

-- Fuera las columnas antiguas (y su índice)
drop index if exists idx_ejercicios_esp_nivel;
alter table public.ejercicios drop column especialidad;
alter table public.ejercicios drop column nivel;

create index idx_ejercicios_cat_tramo on public.ejercicios (categoria_id, tramo_id);
create index idx_ej_opos_esp on public.ejercicio_oposiciones (especialidad);


-- ------------------------------------------------------------
-- 4. PLANES (lo que se compra) + qué categorías incluye cada uno
--    precio editable por el admin. slug para la web pública.
-- ------------------------------------------------------------
create table public.planes (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  slug             text not null unique,
  tipo             tipo_plan not null,
  precio_centimos  int not null check (precio_centimos >= 0),
  especialidad     especialidad,        -- SOLO si tipo = 'oposicion'
  descripcion      text,
  activo           boolean not null default true,
  orden            int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (tipo <> 'oposicion' or especialidad is not null)
);
create trigger trg_planes_updated before update on public.planes
  for each row execute function public.set_updated_at();

-- Categorías incluidas en un plan de tipo 'ejercicio'
-- ('completo' = todas; 'oposicion' = vía ejercicio_oposiciones)
create table public.plan_categorias (
  plan_id       uuid not null references public.planes(id) on delete cascade,
  categoria_id  uuid not null references public.categorias_ejercicio(id) on delete cascade,
  primary key (plan_id, categoria_id)
);

-- Las suscripciones pasan a estar ligadas a un plan. Las filas antiguas
-- (plan_id NULL) se tratan como acceso completo (compatibilidad).
alter table public.suscripciones
  add column plan_id uuid references public.planes(id) on delete set null;
create index idx_susc_plan on public.suscripciones (plan_id);


-- ------------------------------------------------------------
-- 5. PERFIL v2: fuera 'nivel'; entran los datos del cuestionario
-- ------------------------------------------------------------
alter table public.profiles
  add column peso_kg                 numeric check (peso_kg is null or (peso_kg > 20 and peso_kg < 300)),
  add column altura_cm               numeric check (altura_cm is null or (altura_cm > 100 and altura_cm < 250)),
  add column facilidades             text,     -- qué tiene para entrenar en casa
  add column cuestionario_completado boolean not null default false;

-- El trigger anti-escalada referencia 'nivel': hay que recrearlo ANTES
-- de tirar la columna. Sigue protegiendo rol/especialidad/created_by.
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_admin() or auth.uid() is null then
    return new;
  end if;
  if new.rol          is distinct from old.rol
  or new.especialidad is distinct from old.especialidad
  or new.created_by   is distinct from old.created_by then
    raise exception 'No puedes modificar rol, especialidad ni created_by';
  end if;
  return new;
end; $$;

-- Funciones del sistema de niveles: fuera ANTES de tirar columna y tipo
-- (subir_de_nivel y mi_nivel devuelven el tipo 'nivel': dependen de él).
drop function if exists public.puedo_subir_de_nivel();
drop function if exists public.subir_de_nivel();
drop function if exists public.mi_nivel();

alter table public.profiles drop column nivel;
drop type if exists nivel;

-- Tramo asignado al alumno EN CADA categoría (de la autoevaluación;
-- el admin puede reasignar). El alumno gestiona el suyo: es
-- autoevaluación por diseño, y el entrenador siempre puede corregir.
create table public.alumno_tramos (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  categoria_id  uuid not null references public.categorias_ejercicio(id) on delete cascade,
  tramo_id      uuid not null references public.tramos(id) on delete cascade,
  origen        text not null default 'autoevaluacion',  -- autoevaluacion | admin
  updated_at    timestamptz not null default now(),
  primary key (user_id, categoria_id)
);


-- ------------------------------------------------------------
-- 6. REGISTRO DIARIO DE ENTRENAMIENTO
--    Lo que el alumno hizo hoy: reps, peso, distancia, tiempo…
--    'series' (jsonb) guarda desgloses, p.ej. tiempos por cada 100 m:
--    [15.2, 15.8, 16.1] — flexible para cualquier categoría.
-- ------------------------------------------------------------
create table public.registros_entrenamiento (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  categoria_id  uuid not null references public.categorias_ejercicio(id) on delete cascade,
  ejercicio_id  uuid references public.ejercicios(id) on delete set null,
  fecha         date not null default current_date,
  repeticiones  int,
  peso_kg       numeric,
  distancia_km  numeric,
  tiempo_seg    numeric,
  series        jsonb,      -- desgloses (p.ej. tiempos por 100m)
  notas         text,
  created_at    timestamptz not null default now()
);
create index idx_registros_user_fecha on public.registros_entrenamiento (user_id, fecha desc);
create index idx_registros_cat on public.registros_entrenamiento (categoria_id);

-- ------------------------------------------------------------
-- 7. EVALUACIONES (pruebas reales cada 6 semanas, con vídeo)
--    El vídeo se sube a Bunny (mismo flujo TUS que ya usamos);
--    aquí solo guardamos el id. Se conservan por fecha de examen.
-- ------------------------------------------------------------
create table public.evaluaciones (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  categoria_id  uuid references public.categorias_ejercicio(id) on delete set null,
  fecha_examen  date not null default current_date,
  video_id      text,                      -- Bunny Stream
  notas_alumno  text,
  estado        estado_evaluacion not null default 'pendiente',
  feedback      text,                      -- corrección del entrenador
  revisado_por  uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index idx_eval_user_fecha on public.evaluaciones (user_id, fecha_examen desc);
create index idx_eval_estado on public.evaluaciones (estado);


-- ------------------------------------------------------------
-- 8. FUNCIONES DE ACCESO v2
-- ------------------------------------------------------------

-- Tramo actual del alumno en una categoría. Si aún no tiene asignado
-- (no ha hecho el cuestionario), se asume el tramo MÁS BÁSICO.
create or replace function public.mi_tramo(cat uuid)
returns uuid
language sql security definer stable set search_path = public as $$
  select coalesce(
    (select tramo_id from public.alumno_tramos
      where user_id = auth.uid() and categoria_id = cat),
    (select id from public.tramos
      where categoria_id = cat order by orden asc limit 1)
  );
$$;

-- ¿Algún plan ACTIVO del alumno cubre este ejercicio?
--  · plan 'completo'  → todo
--  · plan 'ejercicio' → si la categoría del ejercicio está en el plan
--  · plan 'oposicion' → si el ejercicio está marcado para esa oposición
--  · suscripciones antiguas sin plan → acceso completo (compatibilidad)
create or replace function public.cubierto_por_plan(e_id uuid, e_cat uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.suscripciones s
    left join public.planes p on p.id = s.plan_id
    where s.user_id = auth.uid()
      and s.estado = 'activa'
      and s.fecha_fin >= current_date
      and (
        s.plan_id is null
        or p.tipo = 'completo'
        or (p.tipo = 'ejercicio'
            and exists (select 1 from public.plan_categorias pc
                        where pc.plan_id = p.id and pc.categoria_id = e_cat))
        or (p.tipo = 'oposicion'
            and exists (select 1 from public.ejercicio_oposiciones eo
                        where eo.ejercicio_id = e_id and eo.especialidad = p.especialidad))
      )
  );
$$;


-- ------------------------------------------------------------
-- 9. RLS
-- ------------------------------------------------------------
alter table public.categorias_ejercicio    enable row level security;
alter table public.tramos                  enable row level security;
alter table public.planes                  enable row level security;
alter table public.plan_categorias         enable row level security;
alter table public.ejercicio_oposiciones   enable row level security;
alter table public.alumno_tramos           enable row level security;
alter table public.registros_entrenamiento enable row level security;
alter table public.evaluaciones            enable row level security;

-- Catálogo visible públicamente (la web pública lista los planes)
create policy "categorias: leer activas" on public.categorias_ejercicio
  for select using ( activa or public.es_admin() );
create policy "categorias: gestionar admin" on public.categorias_ejercicio
  for all using ( public.es_admin() ) with check ( public.es_admin() );

create policy "tramos: leer" on public.tramos
  for select using ( true );
create policy "tramos: gestionar admin" on public.tramos
  for all using ( public.es_admin() ) with check ( public.es_admin() );

create policy "planes: leer activos" on public.planes
  for select using ( activo or public.es_admin() );
create policy "planes: gestionar admin" on public.planes
  for all using ( public.es_admin() ) with check ( public.es_admin() );

create policy "plan_categorias: leer" on public.plan_categorias
  for select using ( true );
create policy "plan_categorias: gestionar admin" on public.plan_categorias
  for all using ( public.es_admin() ) with check ( public.es_admin() );

create policy "ej_oposiciones: leer" on public.ejercicio_oposiciones
  for select using ( true );
create policy "ej_oposiciones: gestionar admin" on public.ejercicio_oposiciones
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- Tramos del alumno: el suyo (autoevaluación) o admin
create policy "alumno_tramos: leer propio o admin" on public.alumno_tramos
  for select using ( user_id = auth.uid() or public.es_admin() );
create policy "alumno_tramos: crear propio o admin" on public.alumno_tramos
  for insert with check ( user_id = auth.uid() or public.es_admin() );
create policy "alumno_tramos: actualizar propio o admin" on public.alumno_tramos
  for update using ( user_id = auth.uid() or public.es_admin() );

-- Registros de entrenamiento: el alumno gestiona los suyos; admin lee todo
create policy "registros: leer propio o admin" on public.registros_entrenamiento
  for select using ( user_id = auth.uid() or public.es_admin() );
create policy "registros: crear propio" on public.registros_entrenamiento
  for insert with check ( user_id = auth.uid() );
create policy "registros: editar propio o admin" on public.registros_entrenamiento
  for update using ( user_id = auth.uid() or public.es_admin() );
create policy "registros: borrar propio o admin" on public.registros_entrenamiento
  for delete using ( user_id = auth.uid() or public.es_admin() );

-- Evaluaciones: el alumno crea y ve las suyas; el admin revisa
create policy "evaluaciones: leer propio o admin" on public.evaluaciones
  for select using ( user_id = auth.uid() or public.es_admin() );
create policy "evaluaciones: crear propio" on public.evaluaciones
  for insert with check ( user_id = auth.uid() );
create policy "evaluaciones: actualizar admin" on public.evaluaciones
  for update using ( public.es_admin() );

-- EJERCICIOS: nueva política de visibilidad (la antigua se quitó en el
-- paso 3, antes de tirar sus columnas). Se ve si: publicado + acceso
-- activo + cubierto por algún plan + es de tu tramo actual (o sin tramo).
create policy "ejercicios: leer segun plan y tramo" on public.ejercicios
  for select using (
    public.es_admin()
    or (
      publicado
      and public.tiene_acceso_activo(auth.uid())
      and public.cubierto_por_plan(id, categoria_id)
      and (tramo_id is null or tramo_id = public.mi_tramo(categoria_id))
    )
  );


-- ------------------------------------------------------------
-- 10. DATOS DE ARRANQUE (el admin los edita/añade desde el panel)
--     Un plan completo de ejemplo para poder probar en cuanto
--     exista la Fase 2. Precio editable.
-- ------------------------------------------------------------
insert into public.planes (nombre, slug, tipo, precio_centimos, descripcion, orden)
values ('Preparación completa', 'preparacion-completa', 'completo', 3900,
        'Acceso a todos los ejercicios de la plataforma.', 0);

-- ============================================================
--  FIN migración 014.
--  La Fase 2 (siguiente pieza) trae el panel de admin para
--  categorías, tramos y planes, y el CRUD de ejercicios v2.
-- ============================================================
