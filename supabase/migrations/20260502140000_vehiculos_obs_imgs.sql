alter table if exists public.vehiculos add column if not exists cliente_rut text default '';
alter table if exists public.vehiculos add column if not exists obs text default '';
alter table if exists public.vehiculos add column if not exists imgs jsonb;
