-- ============================================================
-- Lantern — two-way message delete (youth/Telegram chats)
-- Run once in the Supabase SQL editor.
--
-- Stores the Telegram message_id of each worker reply so that deleting
-- the message in the app can also delete the youth's Telegram copy.
-- ============================================================

alter table messages add column if not exists telegram_message_id bigint;
