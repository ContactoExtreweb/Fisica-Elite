-- ============================================================
--  FÍSICAS ÉLITE — Migración 021 · Ejercicios explicativos
--
--  El cliente quiere, dentro de cada categoría, vídeos "explicativos"
--  (press banca, sentadilla, la técnica de un movimiento…) separados de
--  los ejercicios de entrenamiento por tramo. NO es una categoría
--  nueva: es una marca en el ejercicio. El explicativo de Dominadas lo
--  ve quien tenga Dominadas contratadas, exactamente igual que el resto
--  de ejercicios de Dominadas.
--
--  Por eso esta migración NO toca la RLS de 'ejercicios' ni la función
--  cubierto_por_plan(): el acceso sigue siendo el de siempre. La columna
--  solo sirve para que la app los enseñe en su propia sección
--  ("Explicaciones", con filtro por categoría) y no mezclados con el
--  entrenamiento.
--
--  Los explicativos se guardan siempre con tramo_id = NULL (lo fuerza la
--  server action): una explicación de técnica vale para todos los tramos.
--
--  Aditiva: columna con valor por defecto; no toca datos ni políticas.
-- ============================================================

alter table public.ejercicios
  add column if not exists explicativo boolean not null default false;

-- La sección "Explicaciones" y el enlace "N explicaciones" de /inicio
-- filtran por categoría entre los explicativos publicados. Índice
-- parcial: solo indexa esas filas, así que es diminuto.
create index if not exists idx_ejercicios_explicativos
  on public.ejercicios (categoria_id, orden)
  where explicativo and publicado;

-- ============================================================
--  FIN migración 021
-- ============================================================
