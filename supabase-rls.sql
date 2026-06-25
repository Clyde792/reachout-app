-- ============================================================
-- Lantern — turn ON Row-Level Security (lock youth data to logged-in staff)
--
-- ⚠️ ORDER MATTERS — run this LAST, only after BOTH are true, or the app/bot
--    will start getting 401s:
--   1) The BOT is using a SERVICE key that bypasses RLS:
--        set env SUPABASE_SERVICE_KEY = <your Supabase service_role / sb_secret_… key>
--        then redeploy the bot (docker compose up -d --build).
--   2) The APP sends the worker's JWT on every request:
--        screens use dbHeaders() from lib/db.js, and you've tested logging in
--        on a device and reading/sending still works.
--
-- After this runs, only authenticated workers (logged in via Supabase Auth) can
-- read/write these tables. The anonymous public key alone can no longer read
-- youth data. The bot keeps full access via the service key.
--
-- Rollback (if something breaks): re-run with "disable row level security".
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'conversations','messages','workers','worker_profiles','worker_wellbeing',
    'case_history','handover_requests','notes','worker_threads',
    'worker_thread_members','worker_dm_messages'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "lantern_auth_all" on %I;', t);
    execute format(
      'create policy "lantern_auth_all" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- NOTE: this grants any logged-in worker full read/write (matches the product:
-- all staff can see all cases). A later refinement can scope rows by
-- assigned_worker / thread membership for least-privilege.
