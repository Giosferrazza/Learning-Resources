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

-- S1-01-T02: create the profile on sign-up. People may pick student, professor or
-- educator; admin is only ever granted by another admin (S1-28).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' in ('student', 'professor', 'educator')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'student'
    end
  );
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- S1-04: keep profiles.email in step once an email change is confirmed
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, ''), updated_at = now() where id = new.id;
  return new;
end
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
