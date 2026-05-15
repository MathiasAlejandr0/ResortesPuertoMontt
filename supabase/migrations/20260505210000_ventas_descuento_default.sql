-- Evita 23502 si un cliente omite descuento al insertar (PostgREST / JSON).
alter table public.ventas
  alter column descuento set default 0;

update public.ventas
set descuento = 0
where descuento is null;
