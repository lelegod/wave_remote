-- Wave Remote: Supabase schema and RLS policies.
--
-- Owner steps:
--   1. Create a Supabase project at https://supabase.com.
--   2. Open the SQL editor for that project and run this whole file.
--   3. Copy the project URL and anon (public) key from Project Settings > API.
--   4. Paste them into `.env` as SUPABASE_URL and SUPABASE_ANON_KEY (see .env.example).
--
-- Run in the Supabase SQL editor. Creates insert-only tables for intent + feedback.
create table if not exists intents (
  id bigint generated always as identity primary key,
  usecase text not null,
  version text,
  os text,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id bigint generated always as identity primary key,
  sentiment text,
  message text,
  email text,
  version text,
  os text,
  created_at timestamptz not null default now()
);

alter table intents enable row level security;
alter table feedback enable row level security;

-- anon (the shipped key) may INSERT only. No select/update/delete -> the key cannot read or exfiltrate data.
create policy "anon insert intents" on intents for insert to anon with check (true);
create policy "anon insert feedback" on feedback for insert to anon with check (true);
