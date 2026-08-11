-- =============================================================
-- PDFNexus: user_favorite_signatures (Generative Text-to-Signature)
-- Run in the Supabase SQL editor. Extends schema.sql.
-- Stores generated signatures a user hearts; reused on the E-Sign page.
-- RLS: authenticated users can ONLY select/insert/delete their own rows.
-- =============================================================

create table if not exists public.user_favorite_signatures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  text        text not null,                                  -- the name typed
  style       text not null default 'Great Vibes',            -- CSS font-family of the style
  image_base64 text not null,                                 -- PNG data URL rendered client-side
  created_at  timestamptz not null default now()
);

create index if not exists user_favorite_signatures_user_id
  on public.user_favorite_signatures (user_id, created_at desc);

alter table public.user_favorite_signatures enable row level security;

create policy "read own favorite signatures"
  on public.user_favorite_signatures for select
  to authenticated
  using (auth.uid() = user_id);

create policy "insert own favorite signatures"
  on public.user_favorite_signatures for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "delete own favorite signatures"
  on public.user_favorite_signatures for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.user_favorite_signatures from anon;
grant select, insert, delete on table public.user_favorite_signatures to authenticated;
