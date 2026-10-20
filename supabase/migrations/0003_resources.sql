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
  -- TODO(S1-17-T01, S1-17-T02): constrain to the shared vocabulary in client/src/lib/vocabulary.ts
  subject text,
  level text,
  medium text,
  -- TODO(S1-33-T01): goals this resource serves, used by goal-aware ranking
  goals text[] not null default '{}',
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

-- TODO(S1-18-T02, S1-21-T01): limit which status transitions an owner may make
create policy "Owners can update own resources" on public.resources
  for update using (auth.uid() = owner_id);

create policy "Admins can manage all resources" on public.resources
  for all using (public.is_admin());

-- TODO(S1-16-T01): storage policies for uploads (owner-only write, read when published)
insert into storage.buckets (id, name, public)
values ('resource-files', 'resource-files', false)
on conflict (id) do nothing;
