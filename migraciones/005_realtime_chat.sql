-- ============================================================
--  FÍSICA ÉLITE — Migración 005 · Activar Realtime en el chat
--
--  Usamos POSTGRES CHANGES (no Broadcast). Clave de seguridad:
--  Postgres Changes ya respeta la RLS de la tabla que escuchas, así
--  que las políticas de 'mensajes' y 'conversaciones' de la migración
--  001 protegen también el tiempo real. Un alumno solo recibe en vivo
--  los mensajes de SU conversación; los admins, los de todas.
-- ============================================================

-- 1 · Añadir las tablas a la publicación de Realtime.
--     (Envolvemos en DO para que no falle si ya estuvieran añadidas.)
do $$
begin
  begin
    alter publication supabase_realtime add table public.mensajes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversaciones;
  exception when duplicate_object then null;
  end;
end $$;

-- 2 · REPLICA IDENTITY FULL en mensajes: necesario para que los eventos
--     de Realtime lleguen con todas las columnas de la fila (si no, en
--     algunos casos solo llega la clave primaria).
alter table public.mensajes replica identity full;

-- 3 · Índice para la bandeja del admin: ordenar conversaciones por
--     actividad reciente de forma eficiente.
create index if not exists idx_conv_estado_actividad
  on public.conversaciones (estado, last_message_at desc nulls last);
