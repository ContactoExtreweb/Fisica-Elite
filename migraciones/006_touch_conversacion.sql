-- ============================================================
--  FÍSICA ÉLITE — Migración 006 · Sincronizar conversación al enviar
--
--  Cada mensaje nuevo actualiza la conversación: marca la hora del
--  último mensaje (para ordenar la bandeja) y, si estaba cerrada,
--  la reabre. Se hace en un trigger para que sea atómico y no
--  dependa de que el cliente se acuerde de hacerlo.
-- ============================================================

create or replace function public.tocar_conversacion()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversaciones
  set last_message_at = new.created_at,
      estado = case when estado = 'cerrada' then 'abierta' else estado end,
      updated_at = now()
  where id = new.conversacion_id;
  return new;
end; $$;

drop trigger if exists trg_tocar_conversacion on public.mensajes;
create trigger trg_tocar_conversacion
  after insert on public.mensajes
  for each row execute function public.tocar_conversacion();
