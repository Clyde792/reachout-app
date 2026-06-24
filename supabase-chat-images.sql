-- ============================================================
-- Lantern — image sending in chats
-- Run once in the Supabase SQL editor.
-- ============================================================

-- 1. Public bucket to hold chat images.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = true;

-- 2. Allow the app's anon (publishable) key to upload to and read this bucket.
--    (Other buckets are unaffected.)
drop policy if exists "chat-images read"   on storage.objects;
drop policy if exists "chat-images insert" on storage.objects;
create policy "chat-images read"   on storage.objects for select using (bucket_id = 'chat-images');
create policy "chat-images insert" on storage.objects for insert with check (bucket_id = 'chat-images');

-- 3. Store the image URL on each message type.
alter table worker_dm_messages add column if not exists image_url text;
alter table messages           add column if not exists image_url text;
