-- ============================================================
--  FÍSICAS ÉLITE — Migración 032 · Fechas de acceso en horario de Madrid
--
--  La base de datos trabaja en UTC. Las funciones que deciden si un alumno
--  tiene acceso comparaban la fecha de fin de su suscripción con
--  current_date (fecha UTC), mientras la web ya cuenta los días en horario de
--  Madrid. Entre las 00:00 y las 02:00 (verano) o 01:00 (invierno) de Madrid,
--  la BBDD todavía creía que era "ayer": un alumno cuyo acceso había acabado
--  seguía viendo los ejercicios esas horas, aunque la web ya dijera "sin
--  acceso". No es una brecha (solo por horas y a favor del alumno), pero
--  hace que web y BBDD no digan lo mismo.
--
--  Esta migración sustituye current_date por la fecha de Madrid en las
--  funciones de acceso. Lo hace LEYENDO su definición actual y cambiando solo
--  ese texto, para no reescribir de memoria funciones que protegen el
--  contenido de pago: todo lo demás (security definer, search_path, la lógica)
--  queda exactamente como está.
--
--  Al final devuelve una tabla que dice, para cada función, si ya usa la hora
--  de Madrid. Debe salir TRUE en las dos.
--
--  También corrige el valor por defecto de dos columnas de fecha, que usaban
--  la fecha UTC.
-- ============================================================

do $$
declare
  f   record;
  def text;
begin
  for f in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('tiene_acceso_activo', 'cubierto_por_plan')
  loop
    def := pg_get_functiondef(f.oid);
    if def ~* '\ycurrent_date\y' then
      execute regexp_replace(
        def,
        '\ycurrent_date\y',
        '(now() at time zone ''Europe/Madrid'')::date',
        'gi'
      );
      raise notice 'Actualizada a hora de Madrid: %', f.proname;
    else
      raise notice 'No usaba current_date (sin cambios): %', f.proname;
    end if;
  end loop;
end $$;

-- Por defecto, la fecha de HOY en Madrid (la web ya manda la fecha explícita,
-- así que esto solo afecta a inserciones directas)
alter table public.registros_entrenamiento
  alter column fecha set default ((now() at time zone 'Europe/Madrid')::date);

alter table public.evaluaciones
  alter column fecha_examen set default ((now() at time zone 'Europe/Madrid')::date);

-- COMPROBACIÓN: las dos deben salir con usa_hora_madrid = true
select p.proname                                      as funcion,
       pg_get_functiondef(p.oid) ~* 'Europe/Madrid'   as usa_hora_madrid,
       pg_get_functiondef(p.oid) ~* '\ycurrent_date\y' as aun_usa_current_date
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('tiene_acceso_activo', 'cubierto_por_plan')
order by p.proname;

-- ============================================================
--  FIN migración 032
-- ============================================================
