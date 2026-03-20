-- Brution SSOT v1.1 - Initial schema and RLS

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.role_enum as enum ('staff_admin', 'staff_member', 'client_admin', 'client_member');
create type public.status_enum as enum ('active', 'inactive');
create type public.deliverable_type_enum as enum ('keyword', 'ads', 'market', 'brand_identity', 'naming');
create type public.visibility_enum as enum ('client', 'internal');
create type public.version_status_enum as enum ('draft', 'review', 'approved', 'published');
create type public.job_status_enum as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
create type public.job_type_enum as enum ('keyword', 'ads', 'market', 'brand_identity');

-- Tables
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role public.role_enum not null,
  company_id uuid references public.companies(id) on delete set null,
  status public.status_enum not null default 'active',
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type public.deliverable_type_enum not null,
  visibility public.visibility_enum not null default 'client',
  title text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  version_no integer not null default 1,
  status public.version_status_enum not null default 'draft',
  title text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  deliverable_version_id uuid references public.deliverable_versions(id) on delete set null,
  file_type text not null,
  bucket text not null,
  path text not null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evidences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text,
  url text,
  memo text,
  tags text[] not null default '{}',
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type public.job_type_enum not null,
  status public.job_status_enum not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  user_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  ym text not null,
  executions integer not null default 0,
  est_cost_krw integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, ym)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_companies
before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_projects
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_updated_at_deliverables
before update on public.deliverables
for each row execute function public.set_updated_at();

create trigger set_updated_at_deliverable_versions
before update on public.deliverable_versions
for each row execute function public.set_updated_at();

create trigger set_updated_at_jobs
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger set_updated_at_usage_monthly
before update on public.usage_monthly
for each row execute function public.set_updated_at();

-- Helper functions
create or replace function public.current_role()
returns public.role_enum
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role in ('staff_admin', 'staff_member')
  );
$$;

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'staff_admin'
  );
$$;

-- RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.deliverables enable row level security;
alter table public.deliverable_versions enable row level security;
alter table public.assets enable row level security;
alter table public.evidences enable row level security;
alter table public.jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_monthly enable row level security;

-- companies
create policy companies_staff_all on public.companies
for all using (public.is_staff()) with check (public.is_staff());

create policy companies_client_select on public.companies
for select using (id = public.current_company_id());

-- profiles
create policy profiles_staff_all on public.profiles
for all using (public.is_staff()) with check (public.is_staff());

create policy profiles_self_select on public.profiles
for select using (user_id = auth.uid());

create policy profiles_self_update on public.profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- projects
create policy projects_staff_all on public.projects
for all using (public.is_staff()) with check (public.is_staff());

create policy projects_client_select on public.projects
for select using (company_id = public.current_company_id());

create policy projects_client_insert on public.projects
for insert with check (company_id = public.current_company_id());

create policy projects_client_update on public.projects
for update using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

-- deliverables
create policy deliverables_staff_all on public.deliverables
for all using (public.is_staff()) with check (public.is_staff());

create policy deliverables_client_select on public.deliverables
for select using (
  company_id = public.current_company_id()
  and visibility = 'client'
);

-- deliverable_versions
create policy deliverable_versions_staff_all on public.deliverable_versions
for all using (public.is_staff()) with check (public.is_staff());

create policy deliverable_versions_client_select on public.deliverable_versions
for select using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.deliverables d
    where d.id = deliverable_versions.deliverable_id
      and d.visibility = 'client'
  )
);

-- assets
create policy assets_staff_all on public.assets
for all using (public.is_staff()) with check (public.is_staff());

create policy assets_client_insert on public.assets
for insert with check (company_id = public.current_company_id());

create policy assets_client_select_published on public.assets
for select using (
  company_id = public.current_company_id()
  and deliverable_version_id is not null
  and exists (
    select 1
    from public.deliverable_versions dv
    join public.deliverables d on d.id = dv.deliverable_id
    where dv.id = assets.deliverable_version_id
      and dv.status = 'published'
      and d.visibility = 'client'
  )
);

-- evidences (internal only)
create policy evidences_staff_all on public.evidences
for all using (public.is_staff()) with check (public.is_staff());

-- jobs
create policy jobs_staff_all on public.jobs
for all using (public.is_staff()) with check (public.is_staff());

create policy jobs_client_select on public.jobs
for select using (company_id = public.current_company_id());

create policy jobs_client_insert on public.jobs
for insert with check (company_id = public.current_company_id());

-- audit_logs (staff only)
create policy audit_logs_staff_all on public.audit_logs
for all using (public.is_staff()) with check (public.is_staff());

-- usage_monthly
create policy usage_monthly_staff_all on public.usage_monthly
for all using (public.is_staff()) with check (public.is_staff());

create policy usage_monthly_client_select on public.usage_monthly
for select using (company_id = public.current_company_id());
