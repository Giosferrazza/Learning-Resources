-- S1-07-T02 / S1-33-T02: questionnaire answers that drive recommendations
create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  knowledge_level text not null,
  preferred_media text[] not null default '{}', -- empty means any format
  goal text, -- S1-33
  created_at timestamptz not null default now()
);

create index if not exists questionnaire_user_idx on public.questionnaire_responses (user_id, created_at desc);

alter table public.questionnaire_responses enable row level security;

create policy "Users manage own questionnaire responses" on public.questionnaire_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
