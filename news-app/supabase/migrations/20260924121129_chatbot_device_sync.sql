begin;

-- Optional, browser-encrypted visitor transcripts. No relationship to the
-- invite-only newsroom accounts. Only the capability-checking server endpoint
-- can reach these rows; neither anon nor authenticated receives any grant.
create table public.chat_history_vaults (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  revision bigint not null check (revision between 1 and 9007199254740991),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['version', 'iv', 'data']
    and jsonb_typeof(payload->'version') = 'number'
    and jsonb_typeof(payload->'iv') = 'string'
    and jsonb_typeof(payload->'data') = 'string'
    and payload->>'version' = '1'
    and payload->>'iv' ~ '^[A-Za-z0-9_-]{16}$'
    and length(payload->>'data') between 24 and 1500000
    and octet_length(payload::text) <= 1501000
  ),
  updated_at timestamptz not null default now()
);

alter table public.chat_history_vaults enable row level security;
revoke all on public.chat_history_vaults from public, anon, authenticated;
grant select, insert, update, delete on public.chat_history_vaults to service_role;
comment on table public.chat_history_vaults is 'Encrypted opt-in chat history. Pairing/encryption secrets are never stored here. Access only through chat-history function.';

commit;
