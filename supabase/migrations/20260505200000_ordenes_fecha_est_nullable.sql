-- El HTML / backup permite entrega estimada vacía; NOT NULL rechaza insert o fecha inválida.
alter table if exists public.ordenes alter column fecha_est drop not null;
