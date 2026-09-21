-- ============================================================
--  FÍSICAS ÉLITE — Migración 023 · Actividad y recordatorios
--
--  El cliente pidió (reunión 15/09/2026) que la plataforma detecte a los
--  alumnos que dejan de entrar y les mande un correo.
--
--  · ultima_actividad: la apunta el proxy cuando el alumno usa la app
--    (como mucho una escritura cada 6 h). Se crea con valor now() para
--    TODOS los perfiles existentes: así nadie recibe un aviso el primer
--    día por no tener dato; el reloj empieza a contar hoy.
--  · recordatorios_email: el alumno puede darse de baja desde su perfil.
--  · aviso_inactividad_at: cuándo se le mandó el último aviso. Sirve para
--    mandar UNO por racha de inactividad: solo se vuelve a avisar si ha
--    vuelto a entrar después del último aviso y se ha vuelto a parar.
--
--  Aditiva: tres columnas con valor por defecto. No toca RLS: el alumno
--  ya podía actualizar su propio perfil (y el trigger anti-escalada sigue
--  protegiendo rol, especialidad, created_by y presencial).
-- ============================================================

alter table public.profiles
  add column if not exists ultima_actividad     timestamptz not null default now(),
  add column if not exists recordatorios_email  boolean     not null default true,
  add column if not exists aviso_inactividad_at timestamptz;

-- ============================================================
--  FIN migración 023
-- ============================================================
