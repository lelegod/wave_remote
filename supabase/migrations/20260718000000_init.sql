-- init: intent + feedback tables, insert-only for the anon key.

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

-- The shipped anon key may INSERT only. With no select/update/delete policy it
-- cannot read or exfiltrate data.
create policy "anon insert intents" on intents for insert to anon with check (true);
create policy "anon insert feedback" on feedback for insert to anon with check (true);
