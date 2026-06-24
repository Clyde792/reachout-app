-- ============================================================
-- Lantern — Worker-to-Worker chat ("Team" tab)
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- A conversation between workers. Either a 1:1 DM or a named group.
-- For DMs, dm_key = the two emails sorted and joined with '|' so the
-- same pair never gets two threads.
create table if not exists worker_threads (
  id          uuid primary key default gen_random_uuid(),
  is_group    boolean not null default false,
  name        text,                 -- group title (null for DMs)
  dm_key      text unique,          -- "a@x|b@y" for DMs, null for groups
  created_by  text,                 -- creator's email
  created_at  timestamptz not null default now(),
  last_message       text,
  last_message_time  timestamptz,
  last_sender_email  text          -- who sent the last message (for unread badges)
);

-- Membership: one row per (thread, worker).
create table if not exists worker_thread_members (
  id           bigint generated always as identity primary key,
  thread_id    uuid not null references worker_threads(id) on delete cascade,
  member_email text not null,
  member_name  text,
  created_at   timestamptz not null default now(),
  unique (thread_id, member_email)
);

-- Messages within a thread.
create table if not exists worker_dm_messages (
  id           bigint generated always as identity primary key,
  thread_id    uuid not null references worker_threads(id) on delete cascade,
  sender_email text not null,
  sender_name  text,
  content      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_wdm_thread on worker_dm_messages (thread_id, created_at);
create index if not exists idx_wtm_member on worker_thread_members (member_email);

-- Idempotent in case worker_threads already existed from an earlier run.
alter table worker_threads add column if not exists last_sender_email text;

-- Presence: when each worker's app was last seen. Online = within ~2 min.
alter table worker_profiles add column if not exists last_seen timestamptz;

-- This app talks to Supabase with the publishable (anon) key, like the
-- existing `workers` / `conversations` tables, so keep RLS off to match.
alter table worker_threads        disable row level security;
alter table worker_thread_members disable row level security;
alter table worker_dm_messages    disable row level security;
