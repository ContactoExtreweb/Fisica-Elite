-- ============================================================
--  FÍSICAS ÉLITE — Migración 022 · Reservas de clases presenciales
--
--  El preparador da clases de 1 h en el centro, de lunes a viernes,
--  con aforo. Los alumnos PRESENCIALES reservan turno desde la app.
--
--  Datos confirmados por el cliente (17/09/2026), que se cargan como
--  valores iniciales y el admin puede cambiar desde /admin/reservas/horario:
--    · Lunes a viernes, de 06:00 a 14:00 y de 16:00 a 22:00
--      (la parada de 14 a 16 no se puede reservar; fines de semana, cerrado)
--    · Clases de 1 hora · máximo 7 alumnos por turno
--
--  QUIÉN PUEDE RESERVAR: solo quien tenga profiles.presencial = true.
--  Esa marca la pone el admin desde la ficha del alumno, y el trigger
--  anti-escalada impide que un alumno se la ponga a sí mismo (si no,
--  cualquiera con cuenta podría reservar clases en el centro).
--
--  SEGURIDAD DEL AFORO: el alumno NO inserta en 'reservas'. Reserva y
--  cancela a través de dos funciones (security definer) que comprueban
--  todo en el servidor: que es presencial, que el turno existe en el
--  horario, que no está bloqueado, que no ha pasado, la antelación, el
--  tope diario y el aforo. El aforo se comprueba con un candado por
--  turno: si dos alumnos pulsan a la vez en la última plaza, entra uno.
--
--  Aditiva salvo por recrear proteger_campos_perfil() (añade un campo).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Marca "presencial" en el perfil, protegida
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists presencial boolean not null default false;

create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_admin() or auth.uid() is null then
    return new;
  end if;
  if new.rol          is distinct from old.rol
  or new.especialidad is distinct from old.especialidad
  or new.created_by   is distinct from old.created_by
  or new.presencial   is distinct from old.presencial then
    raise exception 'No puedes modificar rol, especialidad, created_by ni presencial';
  end if;
  return new;
end; $$;

-- ------------------------------------------------------------
-- 2. Configuración (una sola fila) y horario semanal
-- ------------------------------------------------------------
create table if not exists public.config_reservas (
  id                    smallint primary key default 1 check (id = 1),
  duracion_min          int not null default 60 check (duracion_min between 15 and 240),
  plazas_por_turno      int not null default 7  check (plazas_por_turno between 1 and 100),
  antelacion_max_dias   int not null default 14 check (antelacion_max_dias between 1 and 90),
  cancelacion_min_horas int not null default 2  check (cancelacion_min_horas between 0 and 168),
  max_por_dia           int not null default 1  check (max_por_dia between 1 and 10),
  updated_at            timestamptz not null default now()
);
insert into public.config_reservas (id) values (1) on conflict (id) do nothing;

-- Franjas de apertura por día de la semana (1 = lunes … 7 = domingo).
-- Un día puede tener varias (mañana y tarde). Sin fila = cerrado.
create table if not exists public.horario_reservas (
  id          uuid primary key default gen_random_uuid(),
  dia_semana  smallint not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin    time not null,
  check (hora_fin > hora_inicio)
);

-- Horario inicial del cliente (solo si la tabla está vacía)
insert into public.horario_reservas (dia_semana, hora_inicio, hora_fin)
select d, h.ini, h.fin
from generate_series(1, 5) as d
cross join (values ('06:00'::time, '14:00'::time), ('16:00'::time, '22:00'::time)) as h(ini, fin)
where not exists (select 1 from public.horario_reservas);

-- Bloqueos puntuales: un día entero (horas a NULL) o una franja.
create table if not exists public.bloqueos_reservas (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  hora_inicio time,
  hora_fin    time,
  motivo      text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (
    (hora_inicio is null and hora_fin is null)
    or (hora_inicio is not null and hora_fin is not null and hora_fin > hora_inicio)
  )
);
create index if not exists idx_bloqueos_fecha on public.bloqueos_reservas (fecha);

-- ------------------------------------------------------------
-- 3. Reservas
-- ------------------------------------------------------------
create table if not exists public.reservas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  fecha         date not null,
  hora          time not null,
  estado        text not null default 'activa' check (estado in ('activa', 'cancelada')),
  cancelada_por text check (cancelada_por in ('alumno', 'admin')),
  cancelada_at  timestamptz,
  created_at    timestamptz not null default now()
);
-- Un alumno no puede tener dos reservas activas en el mismo turno
create unique index if not exists reservas_unica_activa
  on public.reservas (user_id, fecha, hora) where estado = 'activa';
create index if not exists idx_reservas_turno
  on public.reservas (fecha, hora) where estado = 'activa';

-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------
alter table public.config_reservas   enable row level security;
alter table public.horario_reservas  enable row level security;
alter table public.bloqueos_reservas enable row level security;
alter table public.reservas          enable row level security;

-- Configuración, horario y bloqueos: los lee cualquier usuario con
-- sesión (el alumno necesita pintar el calendario); los escribe el admin.
drop policy if exists "config_reservas: leer" on public.config_reservas;
create policy "config_reservas: leer" on public.config_reservas
  for select using (auth.uid() is not null);
drop policy if exists "config_reservas: admin" on public.config_reservas;
create policy "config_reservas: admin" on public.config_reservas
  for all using (public.es_admin()) with check (public.es_admin());

drop policy if exists "horario_reservas: leer" on public.horario_reservas;
create policy "horario_reservas: leer" on public.horario_reservas
  for select using (auth.uid() is not null);
drop policy if exists "horario_reservas: admin" on public.horario_reservas;
create policy "horario_reservas: admin" on public.horario_reservas
  for all using (public.es_admin()) with check (public.es_admin());

drop policy if exists "bloqueos_reservas: leer" on public.bloqueos_reservas;
create policy "bloqueos_reservas: leer" on public.bloqueos_reservas
  for select using (auth.uid() is not null);
drop policy if exists "bloqueos_reservas: admin" on public.bloqueos_reservas;
create policy "bloqueos_reservas: admin" on public.bloqueos_reservas
  for all using (public.es_admin()) with check (public.es_admin());

-- Reservas: cada alumno lee SOLO las suyas; el admin, todas.
-- No hay política de INSERT/UPDATE para el alumno a propósito: reserva y
-- cancela por las funciones de abajo, que validan todo.
drop policy if exists "reservas: leer propias o admin" on public.reservas;
create policy "reservas: leer propias o admin" on public.reservas
  for select using (user_id = auth.uid() or public.es_admin());
drop policy if exists "reservas: gestionar admin" on public.reservas;
create policy "reservas: gestionar admin" on public.reservas
  for all using (public.es_admin()) with check (public.es_admin());

-- ------------------------------------------------------------
-- 5. Funciones
-- ------------------------------------------------------------

-- ¿Existe ese turno en el horario (alineado a la duración) y no está
-- bloqueado? No mira aforo ni fechas pasadas: eso va en reservar_clase.
create or replace function public.turno_valido(p_fecha date, p_hora time)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  cfg    public.config_reservas%rowtype;
  dow    int := extract(isodow from p_fecha); -- 1 lunes … 7 domingo
  encaja boolean;
begin
  select * into cfg from public.config_reservas where id = 1;
  if not found then return false; end if;

  select exists (
    select 1
    from public.horario_reservas h
    where h.dia_semana = dow
      and p_hora >= h.hora_inicio
      and p_hora <  h.hora_fin
      and p_hora + make_interval(mins => cfg.duracion_min) <= h.hora_fin
      and mod((extract(epoch from (p_hora - h.hora_inicio)) / 60)::int, cfg.duracion_min) = 0
  ) into encaja;
  if not encaja then return false; end if;

  if exists (
    select 1
    from public.bloqueos_reservas b
    where b.fecha = p_fecha
      and (b.hora_inicio is null or (p_hora >= b.hora_inicio and p_hora < b.hora_fin))
  ) then
    return false;
  end if;

  return true;
end; $$;

-- Reserva un turno para el alumno con sesión. Lanza excepción con un
-- mensaje en castellano si no puede; la app lo enseña tal cual.
create or replace function public.reservar_clase(p_fecha date, p_hora time)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  cfg   public.config_reservas%rowtype;
  ahora timestamp := (now() at time zone 'Europe/Madrid');
  n     int;
  nuevo uuid;
begin
  if uid is null then
    raise exception 'Tienes que iniciar sesión';
  end if;
  if not exists (
    select 1 from public.profiles where id = uid and presencial and rol = 'alumno'
  ) then
    raise exception 'Las reservas son solo para alumnos presenciales';
  end if;

  select * into cfg from public.config_reservas where id = 1;

  if (p_fecha + p_hora) <= ahora then
    raise exception 'Ese turno ya ha pasado';
  end if;
  if p_fecha > (ahora::date + cfg.antelacion_max_dias) then
    raise exception 'Solo se puede reservar con % días de antelación', cfg.antelacion_max_dias;
  end if;
  if not public.turno_valido(p_fecha, p_hora) then
    raise exception 'Ese turno no está disponible';
  end if;
  if exists (
    select 1 from public.reservas
    where user_id = uid and fecha = p_fecha and hora = p_hora and estado = 'activa'
  ) then
    raise exception 'Ya tienes reservado ese turno';
  end if;
  if (
    select count(*) from public.reservas
    where user_id = uid and fecha = p_fecha and estado = 'activa'
  ) >= cfg.max_por_dia then
    raise exception 'Has llegado al máximo de clases para ese día';
  end if;

  -- Candado por turno: dos reservas simultáneas no pueden pasar del aforo
  perform pg_advisory_xact_lock(hashtext(p_fecha::text || ' ' || p_hora::text));

  select count(*) into n
  from public.reservas
  where fecha = p_fecha and hora = p_hora and estado = 'activa';
  if n >= cfg.plazas_por_turno then
    raise exception 'Ese turno está completo';
  end if;

  insert into public.reservas (user_id, fecha, hora)
  values (uid, p_fecha, p_hora)
  returning id into nuevo;

  return nuevo;
end; $$;

-- Cancela una reserva. El alumno solo las suyas y hasta X horas antes;
-- el admin cualquiera y cuando quiera.
create or replace function public.cancelar_reserva(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  r     public.reservas%rowtype;
  cfg   public.config_reservas%rowtype;
  ahora timestamp := (now() at time zone 'Europe/Madrid');
  admin boolean := public.es_admin();
begin
  if uid is null then
    raise exception 'Tienes que iniciar sesión';
  end if;
  select * into r from public.reservas where id = p_id;
  if not found then
    raise exception 'Reserva no encontrada';
  end if;
  if r.estado <> 'activa' then
    raise exception 'Esa reserva ya estaba cancelada';
  end if;

  if not admin then
    if r.user_id <> uid then
      raise exception 'Reserva no encontrada';
    end if;
    select * into cfg from public.config_reservas where id = 1;
    if (r.fecha + r.hora) - ahora < make_interval(hours => cfg.cancelacion_min_horas) then
      raise exception 'Solo se puede cancelar hasta % horas antes de la clase', cfg.cancelacion_min_horas;
    end if;
  end if;

  update public.reservas
  set estado = 'cancelada',
      cancelada_por = case when admin then 'admin' else 'alumno' end,
      cancelada_at = now()
  where id = p_id;
end; $$;

-- Cuántas plazas hay ocupadas en cada turno de un rango de fechas.
-- Solo el NÚMERO: el alumno ve si queda sitio, nunca quién ha reservado.
create or replace function public.ocupacion_reservas(p_desde date, p_hasta date)
returns table (fecha date, hora time, ocupadas bigint)
language sql stable security definer set search_path = public as $$
  select r.fecha, r.hora, count(*)
  from public.reservas r
  where auth.uid() is not null
    and r.estado = 'activa'
    and r.fecha between p_desde and p_hasta
  group by r.fecha, r.hora
$$;

-- ============================================================
--  FIN migración 022
-- ============================================================
