-- ============================================================
-- PDFNexus - Storage bucket + user_documents (Phase 1)
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1) Private storage bucket for user documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Bucket path convention: <user_id>/<timestamp>_<file_name>
create policy "Users can upload to own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own files"
on storage.objects for select to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own files"
on storage.objects for update to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own files"
on storage.objects for delete to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2) user_documents metadata table
create table if not exists public.user_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  file_name  text not null,
  file_url   text not null,          -- storage object path
  file_size  bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists user_documents_user_id_idx
  on public.user_documents (user_id);
create index if not exists user_documents_created_at_idx
  on public.user_documents (created_at desc);

alter table public.user_documents enable row level security;

create policy "Users can view own documents"
on public.user_documents for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own documents"
on public.user_documents for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own documents"
on public.user_documents for delete to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- Phase 3 - Paywall: usage tracking + subscriptions + RPCs
-- ============================================================

-- 3) Server-side per-feature usage counters
create table if not exists public.user_usage (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  merge_count   int not null default 0,
  split_count   int not null default 0,
  convert_count int not null default 0,
  sign_count    int not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.user_usage enable row level security;

create policy "Users can view own usage"
on public.user_usage for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own usage"
on public.user_usage for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own usage"
on public.user_usage for update to authenticated
using (auth.uid() = user_id);

-- 4) Subscriptions (premium flag - real payment provider webhook replaces/bridges here later)
create table if not exists public.user_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plan       text not null default 'premium',
  status     text not null default 'active',
  trial_ends timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Users can view own subscription"
on public.user_subscriptions for select to authenticated
using (auth.uid() = user_id);

-- 5) RPCs (security definer, explicit grants - no PUBLIC exposure)

-- Reads current usage without incrementing.
create or replace function public.get_usage(p_feature text)
returns table (used int, remaining int, locked boolean, premium boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_max      int  := 3;
  v_used     int  := 0;
  v_premium  boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1 from public.user_subscriptions
    where user_id = v_user and status = 'active'
  ) into v_premium;

  select case p_feature
           when 'merge'   then merge_count
           when 'split'   then split_count
           when 'convert' then convert_count
           when 'sign'    then sign_count
           else 0
         end
  into v_used
  from public.user_usage
  where user_id = v_user;

  v_used := coalesce(v_used, 0);

  return query
  select v_used,
         case when v_premium then null::int else greatest(0, v_max - v_used) end,
         (not v_premium and v_used >= v_max),
         v_premium;
end;
$$;

-- Atomic increment; returns new state so the client can react (open upgrade modal).
create or replace function public.track_usage(p_feature text)
returns table (used int, remaining int, locked boolean, premium boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_max     int  := 3;
  v_premium boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_usage (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  update public.user_usage
  set merge_count   = merge_count   + case when p_feature = 'merge'   then 1 else 0 end,
      split_count   = split_count   + case when p_feature = 'split'   then 1 else 0 end,
      convert_count = convert_count + case when p_feature = 'convert' then 1 else 0 end,
      sign_count    = sign_count    + case when p_feature = 'sign'    then 1 else 0 end,
      updated_at    = now()
  where user_id = v_user;

  select exists (
    select 1 from public.user_subscriptions
    where user_id = v_user and status = 'active'
  ) into v_premium;

  return query
  select * from public.get_usage(p_feature);
end;
$$;

-- Premium activation (7-day trial flag; swap for payment-provider webhook when wired).
create or replace function public.activate_premium_trial()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_subscriptions (user_id, plan, status, trial_ends)
  values (v_user, 'premium', 'active', now() + interval '7 days')
  on conflict (user_id) do update
    set status = 'active', trial_ends = now() + interval '7 days';

  return true;
end;
$$;

revoke execute on function public.get_usage(text) from public;
revoke execute on function public.track_usage(text) from public;
revoke execute on function public.activate_premium_trial() from public;

grant execute on function public.get_usage(text) to authenticated;
grant execute on function public.track_usage(text) to authenticated;
grant execute on function public.activate_premium_trial() to authenticated;