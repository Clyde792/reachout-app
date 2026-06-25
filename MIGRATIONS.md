# Supabase migrations (run order)

The schema is captured as idempotent SQL files (safe to re-run). Apply them in
this order in the Supabase SQL editor on a fresh project:

| # | File | What it adds |
|---|------|--------------|
| 1 | `supabase-team-chat.sql` | `worker_threads`, `worker_thread_members`, `worker_dm_messages`; `worker_profiles.last_seen` (presence) |
| 2 | `supabase-mbti.sql` | `conversations.mbti / mbti_confidence / message_count`; `worker_profiles.mbti` |
| 3 | `supabase-delete-sync.sql` | `messages.telegram_message_id` (two-way delete) |
| 4 | `supabase-chat-images.sql` | public `chat-images` Storage bucket + policies; `image_url` on messages/worker_dm_messages |
| 5 | `supabase-bot-handling.sql` | `conversations.bot_handling` (hand-back-to-bot) |
| 6 | `supabase-rls.sql` | **LAST.** Enables Row-Level Security + authenticated-only policies. ⚠️ Only after the bot uses `SUPABASE_SERVICE_KEY` and the app sends worker JWTs (see file header). |

Pre-existing columns assumed on `worker_profiles`: `email`, `name`, `phone`,
`photo_url`, `photo_base64`, `expo_push_token`.

To recreate the whole DB from scratch: create the Supabase project, then run
1→6 in order.
