-- Pilot V3 Unit 2 — PROVISIONAL(INT-5 / PS-2).
--
-- The ingestion table was created for the test-only development path and
-- constrained `launch_mode` to the single value 'test'. The participant
-- completion pipeline now submits production sessions through the same
-- endpoint with `launch_mode = 'production'`, keeping test and production
-- rows separable on one explicit axis (decision pack §5.2 Model B). The
-- session-status axes ride inside the JSON envelope; they are additionally
-- projected into indexed columns here so an analyst can filter without
-- unpacking the payload. Nothing here is a research variable.
--
-- Idempotency is unchanged: unique (participant_id, game_session_id,
-- export_id), with the payload hash deciding duplicate-vs-conflict.

alter table public.research_session_exports
  drop constraint if exists research_session_exports_launch_mode_check;

alter table public.research_session_exports
  add constraint research_session_exports_launch_mode_check
  check (launch_mode in ('test', 'production'));

alter table public.research_session_exports
  add column if not exists session_status text
    check (session_status in ('completed', 'incomplete', 'error')),
  add column if not exists completion_reason text
    check (
      completion_reason is null
      or completion_reason in ('terminal_room_reached', 'participant_exit', 'technical_error')
    ),
  add column if not exists export_sequence integer
    check (export_sequence is null or export_sequence >= 1),
  add column if not exists page_load_index integer
    check (page_load_index is null or page_load_index >= 1);

create index if not exists research_session_exports_status_idx
  on public.research_session_exports
  (launch_mode, session_status);
