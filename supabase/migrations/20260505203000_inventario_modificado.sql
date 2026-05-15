-- Paridad HTML / backup JSON en líneas de inventario.
alter table if exists public.inventario add column if not exists modificado timestamp with time zone;
