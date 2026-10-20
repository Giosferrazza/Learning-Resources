-- S1-01-T02 / S1-04-T02: one profile row per auth user (created by the sign-up trigger in 0002)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- No update policy: profile writes go through the API, so users can never
-- change their own role or account status (S1-28-T01).
