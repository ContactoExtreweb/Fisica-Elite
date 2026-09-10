-- ============================================================
--  FÍSICA ÉLITE — Migración 013 · Mensajes de contacto
--
--  Guarda los envíos del formulario público de contacto. Así, hasta
--  que montemos el correo (Resend), no se pierde ningún mensaje: el
--  admin los verá en el panel. Cuando haya correo, además llegará por
--  email, pero el registro queda aquí igualmente.
-- ============================================================

create table if not exists public.mensajes_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  oposicion text,
  mensaje text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.mensajes_contacto enable row level security;

-- Cualquiera (anónimo) puede ENVIAR un mensaje (insert). No puede leer.
create policy "contacto: enviar"
  on public.mensajes_contacto for insert
  to anon, authenticated
  with check (true);

-- Solo los admin pueden LEER y ACTUALIZAR (marcar como leído) los mensajes.
create policy "contacto: solo admin lee"
  on public.mensajes_contacto for select
  using (public.es_admin());

create policy "contacto: solo admin actualiza"
  on public.mensajes_contacto for update
  using (public.es_admin());

create index if not exists idx_contacto_created on public.mensajes_contacto (created_at desc);
