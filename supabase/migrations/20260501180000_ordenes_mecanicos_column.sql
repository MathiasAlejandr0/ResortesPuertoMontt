-- Paridad HTML: órdenes con varios mecánicos (JSON en Supabase).
-- Ejecutar en el SQL Editor del proyecto si ya tienes la tabla `ordenes`.

alter table if exists public.ordenes
  add column if not exists mecanicos jsonb;

comment on column public.ordenes.mecanicos is 'Array JSON [{ "id", "nombre" }] — multi-asignación; opcional si solo hay uno en mecanico_id';
