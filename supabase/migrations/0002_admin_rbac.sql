-- =============================================================
-- PDFNexus: Admin RBAC, forced password reset & moderation
-- Run in the Supabase SQL editor. Extends schema.sql.
-- Admin access is granted ONLY by inserting the admin's uuid into
-- public.admin_roles (SQL editor / service role). No other door.
-- Edge function uses SUPABASE_SERVICE_ROLE_KEY (platform env only).
-- =============================================================

-- ---------- profiles: extend with moderation columns ----------
create table if not exists public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text,
  is_banned               boolean not null default false,
  requires_password_reset boolean not null default false,
  premium_until           timestamptz,
  created_at              timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists is_banned boolean not null default false,
  add column if not exists requires_password_reset boolean not null default false;

-- Every auth user gets a profile row; email stays in sync with auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.handle_new_user();

-- ---------- admin_roles: membership table; writes = service role / owner only ----------
create table if not exists public.admin_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  role_type  text not null default 'admin' check (role_type in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

-- ---------- is_admin(): the single, DB-governed gate ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
  );
$$;

-- ---------- RLS: admin-first, self-service only where required ----------
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "admin read all profiles" on public.profiles;
drop policy if exists "read own profile row" on public.profiles;
drop policy if exists "admin update profiles" on public.profiles;
drop policy if exists "clear forced reset" on public.profiles;
drop policy if exists "admin read roles" on public.admin_roles;

-- Admins: full visibility + write access, governed by admin_roles membership.
create policy "admin read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "admin update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- Standard users: strictly their own row, and only to read the forced-reset
-- flag (the reset wall) or clear it while it is set. Nothing else.
create policy "read own profile row"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "clear forced reset"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and requires_password_reset = true)
  with check (auth.uid() = id);

-- admin_roles: readable only by admins. Non-admins get zero rows, so the
-- client's membership probe legitimately returns empty for them.
create policy "admin read roles"
  on public.admin_roles for select
  to authenticated
  using (public.is_admin());

-- ---------- column-scoped grants (row access is policy-controlled) ----------
revoke all on table public.profiles from anon, authenticated;
grant select (id, email, is_banned, requires_password_reset, premium_until, created_at)
  on public.profiles to authenticated;
grant update (requires_password_reset)
  on public.profiles to authenticated;
grant select (id, user_id, role_type)
  on public.admin_roles to authenticated;

grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_admin() from public, anon;