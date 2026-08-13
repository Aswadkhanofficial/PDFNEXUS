-- =============================================================
-- PDFNexus: client-side location backfill permission
-- Run in the Supabase SQL editor. Extends 0006_user_location.sql.
--   - Google OAuth signups never hit the email sign-up flow, so their
--     IP location is never captured. The main layout backfills it
--     client-side (MainLayout.jsx), which requires the authenticated
--     user to be allowed to UPDATE their own `location` column.
-- =============================================================

-- ---------- column-scoped grants, now incl. self-update on location ----------
revoke all on table public.profiles from anon, authenticated;
grant select (id, email, full_name, avatar_url, is_banned,
              requires_password_reset, premium_until, created_at, location)
  on public.profiles to authenticated;
grant update (full_name, avatar_url, requires_password_reset, location)
  on public.profiles to authenticated;
