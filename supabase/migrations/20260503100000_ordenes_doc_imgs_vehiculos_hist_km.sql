-- Campos HTML legacy en órdenes (documento + fotos) e historial km en vehículos.
alter table if exists public.ordenes add column if not exists doc_tipo text;
alter table if exists public.ordenes add column if not exists doc_folio text;
alter table if exists public.ordenes add column if not exists doc_fecha text;
alter table if exists public.ordenes add column if not exists doc_monto numeric;
alter table if exists public.ordenes add column if not exists imgs jsonb;

alter table if exists public.vehiculos add column if not exists hist_km jsonb;

comment on column public.ordenes.imgs is 'Fotos ingreso OT (data URLs o URLs), array JSON';
comment on column public.vehiculos.hist_km is 'Historial kilometraje [{ fecha, km, obs? }] desde HTML legacy';
