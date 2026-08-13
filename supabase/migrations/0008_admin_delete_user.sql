-- =============================================================
-- PDFNexus: hard-delete a user (admin-only, security definer)
-- Run in the Supabase SQL editor. Extends 0002 + 0004.
--   - Admin Console "Delete" button calls this RPC.
--   - Runs as the function owner (postgres) and re-checks admin_roles
--     membership per call. Deleting from auth.users cascades to
--     profiles, admin_roles, favorites, usage, etc.
--   - Admin rows are protected server-side: no admin can be deleted,
--     even by a super admin.
-- =============================================================

create or replace function public.delete_user_by_admin(p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid()) then
    raise exception 'admin access denied' using errcode = '42501';
  end if;

  if exists (select 1 from public.admin_roles where user_id = p_target_user_id) then
    raise exception 'admin roles cannot be deleted';
  end if;

  delete from auth.users where id = p_target_user_id;
  return found;
end;
$$;

revoke all on function public.delete_user_by_admin(uuid) from public, anon;
grant execute on function public.delete_user_by_admin(uuid) to authenticated;
