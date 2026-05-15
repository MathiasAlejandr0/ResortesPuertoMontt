alter table if exists public.ventas
  add column if not exists doc_adjunto_nombre text,
  add column if not exists doc_adjunto_mime text,
  add column if not exists doc_adjunto_data_url text,
  add column if not exists doc_adjunto_size integer,
  add column if not exists cheque_numero text,
  add column if not exists cheque_banco text,
  add column if not exists cheque_fecha_cobro date;

alter table if exists public.ordenes
  add column if not exists doc_adjunto_nombre text,
  add column if not exists doc_adjunto_mime text,
  add column if not exists doc_adjunto_data_url text,
  add column if not exists doc_adjunto_size integer;

alter table if exists public.creditos
  add column if not exists tipo text default 'credito',
  add column if not exists cheque_numero text,
  add column if not exists cheque_banco text,
  add column if not exists cheque_fecha_cobro date,
  add column if not exists cheque_estado text;
