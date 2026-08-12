-- =============================================================
-- PDFNexus: Profile identity (full_name + avatar) & Admin stats
-- Run in the Supabase SQL editor. Extends schema.sql + 0002.
--   - profiles.full_name / avatar_url: users may update ONLY their
--     own row and ONLY these columns (column-scoped grants).
--   - avatars bucket: public bucket, but each user may only write
--     inside their own {user_id}/ folder. Public reads to render
--     avatar_url anywhere via the CDN.
--   - Admin console reads stats/writes moderation ONLY through
--     security-definer RPCs that re-check admin_roles per call.
--     The client never has access to the service_role key.
-- =============================================================

-- ---------- profiles: identity columns ----------
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text;

-- Self-service: users may update their own row; column grants below
-- restrict exactly which columns they can touch (name/avatar/reset).
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- column-scoped grants, now incl. identity columns ----------
revoke all on table public.profiles from anon, authenticated;
grant select (id, email, full_name, avatar_url, is_banned,
              requires_password_reset, premium_until, created_at)
  on public.profiles to authenticated;
grant update (full_name, avatar_url, requires_password_reset)
  on public.profiles to authenticated;

-- ---------- avatars storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each user may only touch files inside their own {user_id}/ folder.
drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars'
              and storage.foldername(name)[1] = auth.uid()::text);

drop policy if exists "avatars: update own" on storage.objects;
create policy "avatars: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars'
         and storage.foldername(name)[1] = auth.uid()::text);

drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars'
         and storage.foldername(name)[1] = auth.uid()::text);

drop policy if exists "avatars: read own" on storage.objects;
create policy "avatars: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars'
         and storage.foldername(name)[1] = auth.uid()::text);

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

-- ---------- RPC: full admin statistics ----------
-- Security definer: runs as owner, bypasses revoked grants, then
-- re-checks admin_roles membership for auth.uid() BEFORE returning
-- anything. Non-admins get an explicit access-denied error.
create or replace function public.admin_get_stats()
returns table (
  total_users        bigint,
  new_users_7d       bigint,
  banned_users       bigint,
  premium_users      bigint,
  pending_resets     bigint,
  total_documents    bigint,
  total_storage_bytes bigint,
  actions_24h        bigint,
  total_actions      bigint,
  top_tools          jsonb,
  recent_signups     jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid()) then
    raise exception 'admin access denied' using errcode = '42501';
  end if;

  select
    (select count(*)::bigint from public.profiles),
    (select count(*)::bigint from public.profiles where created_at >= now() - interval '7 days'),
    (select count(*)::bigint from public.profiles where is_banned),
    (select count(*)::bigint from public.profiles where premium_until > now()),
    (select count(*)::bigint from public.profiles where requires_password_reset),
    (select count(*)::bigint from public.user_usage where created_at >= now() - interval '24 hours'),
    (select count(*)::bigint from public.user_usage)
  into total_users, new_users_7d, banned_users, premium_users,
       pending_resets, actions_24h, total_actions;

  if to_regclass('public.user_documents') is not null then
    select count(*)::bigint, coalesce(sum(file_size), 0)::bigint
      from public.user_documents
      into total_documents, total_storage_bytes;
  else
    total_documents := 0;
    total_storage_bytes := 0;
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object('tool', action_type, 'count', cnt) order by cnt desc),
         '[]'::jsonb)
    into top_tools
    from (
      select action_type, count(*)::bigint as cnt
        from public.user_usage
       group by action_type
    ) t;

  select coalesce(jsonb_agg(
           jsonb_build_object('email', email, 'created_at', created_at) order by created_at desc),
         '[]'::jsonb)
    into recent_signups
    from (
      select email, created_at
        from public.profiles
       order by created_at desc
       limit 10
    ) s;

  return query
    select total_users, new_users_7d, banned_users, premium_users,
           pending_resets, total_documents, total_storage_bytes,
           actions_24h, total_actions, top_tools, recent_signups;
end;
$$;

-- ---------- RPC: toggle ban ----------
create or replace function public.admin_set_banned(p_user_id uuid, p_banned boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid()) then
    raise exception 'admin access denied' using errcode = '42501';
  end if;

  update public.profiles set is_banned = p_banned where id = p_user_id;
  return p_banned;
end;
$$;

-- ---------- RPC: grant/revoke premium (30 days on grant) ----------
create or replace function public.admin_set_premium(p_user_id uuid, p_premium boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid()) then
    raise exception 'admin access denied' using errcode = '42501';
  end if;

  if p_premium then
    update public.profiles
       set premium_until = greatest(coalesce(premium_until, now()), now() + interval '30 days')
     where id = p_user_id;
  else
    update public.profiles set premium_until = null where id = p_user_id;
  end if;

  return p_premium;
end;
$$;

-- ---------- grants: RPCs are authenticated-only doors ----------
revoke all on function public.admin_get_stats(),
                public.admin_set_banned(uuid, boolean),
                public.admin_set_premium(uuid, boolean) from public, anon;
grant execute on function public.admin_get_stats(),
                public.admin_set_banned(uuid, boolean),
                public.admin_set_premium(uuid, boolean) to authenticated;