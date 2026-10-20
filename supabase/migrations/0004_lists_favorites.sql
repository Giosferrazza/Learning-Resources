-- S1-08-T01 / S1-13-T01 / S1-15-T01: saved lists, list members, favorites
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  share_token uuid unique, -- S1-15: null until the owner shares the list
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, resource_id)
);

-- A favorite points at either a resource or a list, never both (S1-08).
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete cascade,
  list_id uuid references public.lists (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((resource_id is null) <> (list_id is null))
);

create unique index if not exists favorites_resource_uniq on public.favorites (user_id, resource_id) where resource_id is not null;
create unique index if not exists favorites_list_uniq on public.favorites (user_id, list_id) where list_id is not null;

alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.favorites enable row level security;

create policy "Owners manage own lists" on public.lists
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owners manage own list items" on public.list_items
  for all using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

create policy "Users manage own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared-list reads (S1-15-T01) go through the API with the service role, looked up by share_token.
