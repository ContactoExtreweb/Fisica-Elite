-- ============================================================
--  FÍSICAS ÉLITE — Migración 025 · "Continúa por donde lo dejaste"
--
--  El cliente pidió separar la lista de ejercicios de /inicio (que pasa
--  a ser un panel: "continúa aquí", "el siguiente" y un enlace a "todos
--  los ejercicios"). Para poder ofrecer "continúa por donde lo dejaste"
--  hace falta saber cuál fue el último ejercicio que abrió cada alumno.
--
--  · ultimo_ejercicio_id: se apunta en app/ejercicio/[slug]/page.tsx,
--    SOLO en ejercicios de entrenamiento (no en los explicativos: esos
--    son técnica suelta, no forman parte del "por dónde vas").
--    on delete set null: si el admin borra ese ejercicio, no rompe nada.
--  · ultimo_ejercicio_visto_at: por si algún día hace falta ordenar o
--    caducar el dato; hoy no se usa para mostrar nada.
--
--  Aditiva: dos columnas con valor por defecto. No toca RLS — el alumno
--  ya podía actualizar su propio perfil (ver migración 022/023), y el
--  trigger anti-escalada no protege estas columnas.
-- ============================================================

alter table public.profiles
  add column if not exists ultimo_ejercicio_id uuid references public.ejercicios(id) on delete set null,
  add column if not exists ultimo_ejercicio_visto_at timestamptz;

-- ============================================================
--  FIN migración 025
-- ============================================================
