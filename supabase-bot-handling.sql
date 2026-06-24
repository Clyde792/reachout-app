-- ============================================================
-- Lantern — "hand back to bot" during working hours
-- Run once in the Supabase SQL editor.
--
-- When a worker hands a chat back to the bot, this flag lets Buddy keep
-- replying even in working hours, until a worker becomes active again.
-- ============================================================

alter table conversations add column if not exists bot_handling boolean default false;
