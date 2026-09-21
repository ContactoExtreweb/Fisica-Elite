-- ============================================================
--  FÍSICAS ÉLITE — Migración 029 · Límites de uso del asistente virtual
--
--  El asistente (chatbot) de la web pública y de la plataforma llama a un
--  modelo de IA de terceros. Con un modelo GRATUITO el riesgo no es el
--  coste sino que cualquiera con un script agote la cuota diaria o lo use
--  como IA gratis. Por eso cada petición pasa por un contador:
--
--    · por visitante (anónimo: huella HMAC de su IP, nunca la IP en claro;
--      alumno: su id de usuario),
--    · y global (tope diario para toda la web).
--
--  Postgres es el sitio correcto: en Vercel cada petición puede caer en un
--  servidor distinto, así que un contador en memoria no serviría.
--
--  SEGURIDAD
--  · La tabla tiene RLS activada y NINGUNA política: ni anon ni alumnos ni
--    el admin de la app pueden leerla ni escribirla desde el navegador.
--  · La función solo puede ejecutarla service_role (el servidor de la app,
--    en app/api/asistente). Se revoca a public/anon/authenticated.
--  · No guarda mensajes ni datos personales: solo contadores por hora/día.
-- ============================================================

create table public.asistente_uso (
  clave    text not null,   -- 'ip:<huella>' | 'u:<user_id>' | 'global'
  ventana  text not null,   -- '2026-09-21T19' (hora) | '2026-09-21' (día), en hora de Madrid
  n        int  not null default 0,
  primary key (clave, ventana)
);

alter table public.asistente_uso enable row level security;
-- (sin políticas a propósito: solo service_role, que se salta la RLS)
-- Además, cinturón y tirantes: ni siquiera privilegios de tabla para el navegador.
revoke all on public.asistente_uso from anon, authenticated;

-- Suma 1 al contador de la hora y del día y dice si sigue dentro de los
-- límites. Cuenta también los intentos rechazados: quien insiste, sigue
-- bloqueado, en vez de poder "ganar" hueco reintentando.
create or replace function public.asistente_consumir(
  p_clave        text,
  p_limite_hora  int,
  p_limite_dia   int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ahora   timestamp := now() at time zone 'Europe/Madrid';
  v_hora  text := to_char(ahora, 'YYYY-MM-DD"T"HH24');
  v_dia   text := to_char(ahora, 'YYYY-MM-DD');
  n_hora  int;
  n_dia   int;
begin
  insert into public.asistente_uso (clave, ventana, n)
    values (p_clave, v_hora, 1)
    on conflict (clave, ventana) do update set n = asistente_uso.n + 1
    returning n into n_hora;

  insert into public.asistente_uso (clave, ventana, n)
    values (p_clave, v_dia, 1)
    on conflict (clave, ventana) do update set n = asistente_uso.n + 1
    returning n into n_dia;

  -- Limpieza: en la primera petición del día de cada persona, fuera todo lo
  -- de hace más de 2 días. Las ventanas empiezan por la fecha, así que
  -- comparan bien como texto. (El cron diario de /api/cron/inactividad
  -- también lo hace, para que no quede nada aunque un día no haya uso.)
  if n_dia = 1 then
    delete from public.asistente_uso
    where ventana < to_char(ahora::date - 2, 'YYYY-MM-DD');
  end if;

  return n_hora <= p_limite_hora and n_dia <= p_limite_dia;
end;
$$;

revoke all on function public.asistente_consumir(text, int, int) from public, anon, authenticated;
grant execute on function public.asistente_consumir(text, int, int) to service_role;

-- ============================================================
--  FIN migración 029
-- ============================================================
