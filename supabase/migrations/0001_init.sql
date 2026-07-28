-- KanalPro: initial multi-tenant schema
-- Every company (tenant) gets one row in `companies`. Every auth user gets
-- exactly one `profiles` row that ties them to a company and a role.

create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'admin', 'mitarbeiter')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_company_id_idx on public.profiles (company_id);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;

-- Returns the company_id of the currently authenticated user.
-- SECURITY DEFINER so it can read `profiles` without recursing into RLS.
create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- companies -----------------------------------------------------------

create policy "companies_select_own"
  on public.companies for select
  using (id = public.current_company_id());

create policy "companies_insert_authenticated"
  on public.companies for insert
  with check (auth.role() = 'authenticated');

create policy "companies_update_owner_admin"
  on public.companies for update
  using (
    id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  );

-- profiles -------------------------------------------------------------

create policy "profiles_select_same_company"
  on public.profiles for select
  using (company_id = public.current_company_id());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid());
