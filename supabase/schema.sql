-- =============================================================
-- PDFNexus: Business Logic & Paywall schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Usage model:
--   - Authenticated users get DAILY_LIMIT (3) free actions per
--     action_type (tool), resetting at server-local midnight.
--   - Guests are tracked client-side (1 free action, then forced
--     to log in/sign up) and are invisible to this table.
--   - Clients may ONLY reach this data through the SECURITY
--     DEFINER RPCs below; direct table access is revoked.
-- =============================================================

-- ---------- user_usage: one row per free action ----------
create table if not exists public.user_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  action_type text not null,
  created_at  timestamptz not null default now()
);

-- Daily counting is the hot path: (user, tool, day) buckets.
create index if not exists user_usage_user_type_day
  on public.user_usage (user_id, action_type, created_at desc);

-- Strict RLS: users see/insert ONLY their own rows.
alter table public.user_usage enable row level security;

create policy "read own usage"
  on public.user_usage for select
  using (auth.uid() = user_id);

create policy "insert own usage"
  on public.user_usage for insert
  with check (auth.uid() = user_id);

-- ---------- profiles: premium state ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  premium_until timestamptz, -- NULL = free tier
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------- lock tables down: RPCs are the only door ----------
revoke all on table public.user_usage, public.profiles from anon, authenticated;

-- ---------- RPC: current usage for a tool ----------
create or replace function public.get_usage(p_feature text)
returns table (used bigint, remaining bigint, locked boolean, premium boolean)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::bigint
       from public.user_usage
      where user_id = auth.uid()
        and action_type = p_feature
        and created_at >= date_trunc('day', now())) as used,
    greatest(3 - (select count(*)
       from public.user_usage
      where user_id = auth.uid()
        and action_type = p_feature
        and created_at >= date_trunc('day', now())), 0)::bigint as remaining,
    (select count(*)
       from public.user_usage
      where user_id = auth.uid()
        and action_type = p_feature
        and created_at >= date_trunc('day', now())) >= 3 as locked,
    coalesce((select premium_until > now()
                from public.profiles
               where id = auth.uid()), false) as premium;
$$;

-- ---------- RPC: record a free action, return new state ----------
create or replace function public.track_usage(p_feature text)
returns table (used bigint, remaining bigint, locked boolean, premium boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used bigint;
  v_premium boolean;
begin
  insert into public.user_usage (user_id, action_type)
  values (auth.uid(), p_feature);

  select count(*)
    into v_used
    from public.user_usage
   where user_id = auth.uid()
     and action_type = p_feature
     and created_at >= date_trunc('day', now());

  select coalesce((select premium_until > now()
                     from public.profiles
                    where id = auth.uid()), false)
    into v_premium;

  return query
    select v_used,
           greatest(3 - v_used, 0)::bigint,
           v_used >= 3,
           v_premium;
end;
$$;

-- ---------- RPC: start/refresh the 7-day premium trial ----------
create or replace function public.activate_premium_trial()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.profiles (id, premium_until)
  values (auth.uid(), now() + interval '7 days')
  on conflict (id) do update
    set premium_until = greatest(public.profiles.premium_until, now() + interval '7 days');
$$;

-- ---------- grants: only authenticated may invoke ----------
revoke all on function public.get_usage(text), public.track_usage(text),
                public.activate_premium_trial() from public, anon;
grant execute on function public.get_usage(text), public.track_usage(text),
                public.activate_premium_trial() to authenticated;