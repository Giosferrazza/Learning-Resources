-- S1-28-T01 / S1-23-T01 / S1-06-T02: roles, account status, onboarding flag
create type public.user_role as enum ('student', 'professor', 'educator', 'admin');
create type public.account_status as enum ('active', 'suspended');

alter table public.profiles
  add column role public.user_role not null default 'student',
  add column account_status public.account_status not null default 'active',
  add column walkthrough_completed_at timestamptz;

-- Used by RLS policies across the schema. security definer so it can read
-- profiles without tripping the profiles policies themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create policy "Admins can read all profiles" on public.profiles
  for select using (public.is_admin());

-- TODO(S1-28-T01): stop users from changing their own role/account_status via
-- the "Users can update own profile" policy (column grants or a trigger)
