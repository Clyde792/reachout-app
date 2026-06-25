-- ============================================================
-- Lantern — data retention / purge (PDPA: keep only as long as needed)
--
-- Policy (set the window per SCS guidance): purge INACTIVE, non-crisis,
-- UNASSIGNED conversations (and their messages) after N days of no activity.
-- Crisis cases and cases assigned to a worker are retained.
--
-- ⚠️ Destructive. ALWAYS run the PREVIEW first and review before the DELETE.
-- ============================================================

-- Tune this:
--   inactivity window = 180 days (change as needed)

-- 1) PREVIEW — what WOULD be purged (run this first, review the list):
select chat_id, username, last_message_time, risk_level, crisis, assigned_worker
from conversations
where assigned_worker is null
  and coalesce(crisis, false) = false
  and last_message_time < (now() - interval '180 days')
order by last_message_time;

-- 2) PURGE — uncomment to actually delete (messages cascade via chat_id):
-- with stale as (
--   select chat_id from conversations
--   where assigned_worker is null
--     and coalesce(crisis, false) = false
--     and last_message_time < (now() - interval '180 days')
-- )
-- , del_msgs as (
--   delete from messages where chat_id in (select chat_id from stale)
-- )
-- delete from conversations where chat_id in (select chat_id from stale);

-- 3) (Optional) schedule monthly with pg_cron if enabled on the project:
-- select cron.schedule('lantern-retention', '0 3 1 * *', $$
--   delete from messages where chat_id in (
--     select chat_id from conversations
--     where assigned_worker is null and coalesce(crisis,false)=false
--       and last_message_time < (now() - interval '180 days'));
--   delete from conversations
--     where assigned_worker is null and coalesce(crisis,false)=false
--       and last_message_time < (now() - interval '180 days');
-- $$);

-- Individual youth's "right to be forgotten" (PDPA): purge one chat by id:
-- delete from messages where chat_id = <CHAT_ID>;
-- delete from conversations where chat_id = <CHAT_ID>;
