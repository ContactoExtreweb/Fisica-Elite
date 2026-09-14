-- ============================================================
--  FÍSICAS ÉLITE — Migración 020 · Limpiar vídeos huérfanos
--
--  OPCIONAL, y solo de DATOS: no cambia ni tablas ni políticas.
--
--  POR QUÉ:
--  La librería de Bunny Stream anterior desapareció (trial caducado), y
--  con ella todos los vídeos. Las filas de 'ejercicios' siguen guardando
--  el video_id de aquella librería, así que apuntan al vacío: la ficha
--  carga bien pero el reproductor sale en error.
--
--  Esto los deja a NULL para que las fichas muestren "Sin vídeo" hasta
--  que se vuelvan a subir a la librería nueva.
--
--  ⚠️ Si la librería vieja apareciera de nuevo, esto NO se puede
--  deshacer: los guid se pierden. Aplícalo solo con la certeza de que
--  esos vídeos ya no existen (que es el caso: Stream está vacío).
-- ============================================================

-- Antes de tocar nada, mira qué se va a perder:
--
--   select count(*) from public.ejercicios where video_id is not null;
--
-- Si el número te sorprende, PARA y revísalo.

update public.ejercicios
set video_id = null,
    video_duracion = null
where video_id is not null;


-- Las pruebas reales de los alumnos (tabla 'evaluaciones') también
-- guardan video_id. Ahora mismo debería estar vacía —la funcionalidad
-- es nueva—, pero por si acaso se limpia igual.
update public.evaluaciones
set video_id = null
where video_id is not null;


-- ------------------------------------------------------------
--  COMPROBACIÓN
-- ------------------------------------------------------------
-- select
--   (select count(*) from public.ejercicios where video_id is not null) as ejercicios_con_video,
--   (select count(*) from public.evaluaciones where video_id is not null) as pruebas_con_video;
-- Las dos deberían dar 0.

-- ============================================================
--  FIN migración 020
-- ============================================================
