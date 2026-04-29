-- Resortes Puerto Montt: base online multi-organizacion
-- Ejecutar una sola vez en Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi taller',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists organization_members_user_id_idx on public.organization_members (user_id);

create table if not exists public.org_snapshots (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  db jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.org_snapshots enable row level security;

drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member" on public.organizations
for select
using (
  exists (
    select 1
    from public.organization_members m
    where m.org_id = organizations.id and m.user_id = auth.uid()
  )
);

drop policy if exists "members_select_self" on public.organization_members;
create policy "members_select_self" on public.organization_members
for select
using (user_id = auth.uid());

drop policy if exists "snapshots_all_member" on public.org_snapshots;
create policy "snapshots_all_member" on public.org_snapshots
for all
using (
  exists (
    select 1
    from public.organization_members m
    where m.org_id = org_snapshots.org_id and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.org_id = org_snapshots.org_id and m.user_id = auth.uid()
  )
);

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  insert into public.organizations (name)
  values (coalesce(nullif(trim(p_name), ''), 'Mi taller'))
  returning id into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org, auth.uid(), 'admin');

  insert into public.org_snapshots (org_id, db, settings)
  values (v_org, '{}'::jsonb, '{}'::jsonb)
  on conflict (org_id) do nothing;

  return v_org;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.org_snapshots;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
