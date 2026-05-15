-- ISO / texto del backup HTML (equivalente al resto de entidades).
alter table if exists public.inventario add column if not exists creado text default '';
