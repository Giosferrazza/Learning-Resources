-- S1-16-T01 / S1-17-T02 / S1-21-T01 / S1-25-T01: learning resources
-- Lifecycle: draft -> pending -> published | rejected. Admins can also mark removed (S1-24).
create type public.resource_status as enum ('draft', 'pending', 'published', 'rejected', 'removed');

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  url text,
  file_path text, -- object path in the resource-files bucket
  -- S1-17: values come from shared/vocabulary.ts; the API validates subject and goals
  subject text,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  medium text check (medium in ('video', 'article', 'tool')),
  goals text[] not null default '{}', -- S1-33: goals this resource serves
  status public.resource_status not null default 'draft',
  cloned_from uuid references public.resources (id) on delete set null, -- S1-20
  review_note text, -- S1-25 rejection reason
  reviewed_by uuid references public.profiles (id),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_owner_idx on public.resources (owner_id);
create index if not exists resources_status_idx on public.resources (status);

alter table public.resources enable row level security;

create policy "Anyone signed in can read published resources" on public.resources
  for select using (status = 'published' and auth.uid() is not null);

create policy "Owners can read own resources" on public.resources
  for select using (auth.uid() = owner_id);

create policy "Owners can create resources" on public.resources
  for insert with check (auth.uid() = owner_id);

-- Status transitions are enforced by the API (S1-18-T02, S1-21-T01)
create policy "Owners can update own resources" on public.resources
  for update using (auth.uid() = owner_id);

create policy "Admins can manage all resources" on public.resources
  for all using (public.is_admin());

-- S1-16-T01: private bucket. Signed-in users upload into a folder named after their user id;
-- the API hands out short-lived signed URLs for reading.
insert into storage.buckets (id, name, public, file_size_limit)
values ('resource-files', 'resource-files', false, 20971520)
on conflict (id) do nothing;

create policy "Users upload into own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resource-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users manage own uploads" on storage.objects
  for all to authenticated
  using (bucket_id = 'resource-files' and (storage.foldername(name))[1] = auth.uid()::text);
