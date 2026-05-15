-- Paridad HTML: cliente persona / empresa y contacto en empresa
-- Ejecutar en Supabase si la tabla `clientes` ya existe con columnas base.

alter table if exists public.clientes add column if not exists tipo text default 'persona';
alter table if exists public.clientes add column if not exists contacto_nom text default '';
alter table if exists public.clientes add column if not exists contacto_cargo text default '';
alter table if exists public.clientes add column if not exists contacto_tel text default '';
alter table if exists public.clientes add column if not exists contacto_email text default '';
alter table if exists public.clientes add column if not exists modificado timestamptz;
