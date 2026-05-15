-- Documento tributario opcional en ventas (paridad HTML)
alter table public.ventas add column if not exists doc_tipo text;
alter table public.ventas add column if not exists doc_folio text;
alter table public.ventas add column if not exists doc_fecha date;
alter table public.ventas add column if not exists doc_monto numeric;
