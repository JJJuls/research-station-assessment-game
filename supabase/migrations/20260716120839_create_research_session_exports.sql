create table public.research_session_exports (
  id bigint generated always as identity primary key,

  export_id uuid not null,
  participant_id text not null,
  game_session_id text not null,

  launch_mode text not null
    check (launch_mode = 'test'),

  payload jsonb not null,
  payload_hash text,

  client_created_at timestamptz not null,
  server_received_at timestamptz not null default now(),

  unique (participant_id, game_session_id, export_id)
);

alter table public.research_session_exports
  enable row level security;

revoke all
  on table public.research_session_exports
  from anon, authenticated;

grant select, insert, update
  on table public.research_session_exports
  to service_role;

create index research_session_exports_session_idx
  on public.research_session_exports
  (participant_id, game_session_id);