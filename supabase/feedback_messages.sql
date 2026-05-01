create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  user_email text null,
  language text not null default 'en',
  message text not null,
  created_at timestamptz not null default now()
);

alter table if exists public.feedback_messages enable row level security;

drop policy if exists "feedback_insert_any" on public.feedback_messages;
create policy "feedback_insert_any"
on public.feedback_messages
for insert
with check (true);
