-- =============================================================
-- PDFNexus: Signup location (city, country) via IP geolocation
-- Run in the Supabase SQL editor. Extends schema.sql + 0002 + 0004.
--   - Signup stores "City, Country" in auth.users.raw_user_meta_data
--     under the key 'location' (client-side, silent, non-blocking).
--   - auth.users is never client-readable, so handle_new_user mirrors
--     the metadata into public.profiles.location for the Admin Console.
-- =============================================================

-- ---------- profiles: location column ----------
alter table public.profiles
  add column if not exists location text;

-- ---------- mirror user_metadata.location into profiles ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, location)
  values (new.id, new.email, new.raw_user_meta_data ->> 'location')
  on conflict (id) do update
    set email = excluded.email,
        location = coalesce(excluded.location, public.profiles.location);
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

-- ---------- column-scoped grants, now incl. location ----------
revoke all on table public.profiles from anon, authenticated;
grant select (id, email, full_name, avatar_url, is_banned,
              requires_password_reset, premium_until, created_at, location)
  on public.profiles to authenticated;
grant update (full_name, avatar_url, requires_password_reset)
  on public.profiles to authenticated;
