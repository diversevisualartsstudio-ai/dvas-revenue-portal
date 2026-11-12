-- DVAS Revenue Portal: initial multi-tenant revenue data model.
-- Apply with: supabase db push

create extension if not exists pgcrypto;

create type public.org_role as enum ('admin', 'editor', 'viewer');
create type public.opportunity_stage as enum ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
create type public.security_status as enum ('healthy', 'monitor', 'action');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  external_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, external_ref)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  stage public.opportunity_stage not null default 'lead',
  amount numeric(14,2) not null default 0 check (amount >= 0),
  currency char(3) not null default 'USD',
  expected_close_date date,
  source text not null default 'manual',
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, source, external_ref)
);

create table public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  recognized_on date not null default current_date,
  source text not null default 'manual',
  external_ref text,
  description text,
  created_at timestamptz not null default now(),
  unique (org_id, source, external_ref)
);

create table public.security_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  control_name text not null,
  status public.security_status not null default 'monitor',
  owner_name text,
  due_date date,
  notes text,
  source text not null default 'manual',
  external_ref text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (org_id, source, external_ref)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index clients_org_idx on public.clients(org_id);
create index opportunities_org_stage_idx on public.opportunities(org_id, stage);
create index revenue_org_date_idx on public.revenue_records(org_id, recognized_on desc);
create index security_checks_org_status_idx on public.security_checks(org_id, status);
create index audit_logs_org_created_idx on public.audit_logs(org_id, created_at desc);

-- SECURITY DEFINER helpers avoid recursive membership-table RLS checks.
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_write_access(target_org uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = (select auth.uid())
      and m.role in ('admin', 'editor')
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = (select auth.uid())
      and m.role = 'admin'
  );
$$;

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.clients enable row level security;
alter table public.opportunities enable row level security;
alter table public.revenue_records enable row level security;
alter table public.security_checks enable row level security;
alter table public.audit_logs enable row level security;

create policy "Members can view their organizations" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "Admins can update their organizations" on public.organizations
  for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "Members can view organization membership" on public.org_members
  for select to authenticated using (public.is_org_member(org_id));
create policy "Admins can manage organization membership" on public.org_members
  for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy "Members can view clients" on public.clients
  for select to authenticated using (public.is_org_member(org_id));
create policy "Editors can manage clients" on public.clients
  for all to authenticated using (public.has_org_write_access(org_id)) with check (public.has_org_write_access(org_id));

create policy "Members can view opportunities" on public.opportunities
  for select to authenticated using (public.is_org_member(org_id));
create policy "Editors can manage opportunities" on public.opportunities
  for all to authenticated using (public.has_org_write_access(org_id)) with check (public.has_org_write_access(org_id));

create policy "Members can view revenue" on public.revenue_records
  for select to authenticated using (public.is_org_member(org_id));
create policy "Editors can manage revenue" on public.revenue_records
  for all to authenticated using (public.has_org_write_access(org_id)) with check (public.has_org_write_access(org_id));

create policy "Members can view security checks" on public.security_checks
  for select to authenticated using (public.is_org_member(org_id));
create policy "Editors can manage security checks" on public.security_checks
  for all to authenticated using (public.has_org_write_access(org_id)) with check (public.has_org_write_access(org_id));

create policy "Admins can view audit logs" on public.audit_logs
  for select to authenticated using (public.is_org_admin(org_id));
create policy "Members can append audit logs" on public.audit_logs
  for insert to authenticated with check (public.is_org_member(org_id) and actor_id = (select auth.uid()));

-- This migration intentionally does not create an organization or assign an admin.
-- Bootstrap the first organization/member via a trusted server-side admin process.
