-- Campos opcionales para liquidaciones / remuneraciones (paridad HTML).
alter table if exists public.mecanicos add column if not exists rut text default '';
alter table if exists public.mecanicos add column if not exists sueldo_base numeric default 0;

comment on column public.mecanicos.rut is 'RUT trabajador (opcional)';
comment on column public.mecanicos.sueldo_base is 'Sueldo base mensual para panel de remuneraciones';
