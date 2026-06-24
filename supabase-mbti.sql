-- ============================================================
-- Lantern — MBTI extraction & worker compatibility matching
-- Run once in the Supabase SQL editor.
--
-- NOTE on table mapping (this stack vs. the generic spec):
--   "youths"  -> conversations   (one row per youth chat)
--   "workers" -> worker_profiles (the staff login accounts)
-- ============================================================

-- Youth side: inferred MBTI, confidence, and a message counter.
alter table conversations add column if not exists mbti            varchar(4);
alter table conversations add column if not exists mbti_confidence numeric(3,2);
alter table conversations add column if not exists message_count   int default 0;

-- Worker side: the MBTI they pick in their profile.
alter table worker_profiles add column if not exists mbti varchar(4);
