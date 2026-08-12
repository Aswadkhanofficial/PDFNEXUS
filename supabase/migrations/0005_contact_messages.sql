-- =============================================================
-- PDFNexus: contact_messages (Contact Us form)
-- Run in the Supabase SQL editor. Extends schema.sql.
-- Stores messages submitted from the public Contact Us page.
-- RLS: anyone (anon or authenticated) can insert; no reads for anon.
-- =============================================================

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_created_at
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

create policy "insert contact messages"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

create policy "admin read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin());

create policy "admin delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (public.is_admin());

revoke all on table public.contact_messages from anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;
grant select, delete on table public.contact_messages to authenticated;