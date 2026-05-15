-- Descuento global en cotizaciones y órdenes (documento), alineado con ventas
alter table if exists public.cotizaciones
  add column if not exists descuento numeric not null default 0;

alter table if exists public.ordenes
  add column if not exists descuento numeric not null default 0;
