-- Sprint 2 schema. The API uses the service role, so RLS here only guards direct client access.

-- S2-02 Support requests. Guests can write in too, so user_id is optional and email is required.
create type public.support_status as enum ('open', 'resolved');

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null default '',
  email text not null,
  category text not null, -- see supportCategories in shared/vocabulary.ts
  subject text not null,
  message text not null,
  status public.support_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists support_requests_status_idx on public.support_requests (status, created_at desc);
create index if not exists support_requests_user_idx on public.support_requests (user_id, created_at desc);
alter table public.support_requests enable row level security;
create policy "Users read own support requests" on public.support_requests
  for select using (auth.uid() = user_id);
create policy "Admins manage support requests" on public.support_requests
  for all using (public.is_admin());

-- S2-04 / S2-16 One student holds many questionnaires; editing one only touches that row.
alter table public.questionnaire_responses
  add column if not exists updated_at timestamptz not null default now();

-- S2-17 A snapshot of the recommendations at every submission and edit, kept after retakes.
create table if not exists public.questionnaire_snapshots (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.questionnaire_responses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('submitted', 'edited', 'before_edit')),
  answers jsonb not null, -- the answers this snapshot was computed from
  items jsonb not null default '[]', -- [{ id, title, subject, level, medium, exact, reasons, gaps }]
  exact boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists questionnaire_snapshots_user_idx on public.questionnaire_snapshots (user_id, created_at desc);
create index if not exists questionnaire_snapshots_response_idx on public.questionnaire_snapshots (response_id, created_at desc);
alter table public.questionnaire_snapshots enable row level security;
create policy "Users read own snapshots" on public.questionnaire_snapshots
  for select using (auth.uid() = user_id);

-- S2-05 Tell new resources apart from updated ones when notifying students.
alter table public.resources add column if not exists first_published_at timestamptz;
update public.resources set first_published_at = coalesce(reviewed_at, created_at)
  where status = 'published' and first_published_at is null;

-- S2-05 One notification per person, resource and kind.
create index if not exists notifications_dedupe_idx on public.notifications (user_id, resource_id, type);

-- S2-12 Engagement: resource views and link opens.
create table if not exists public.resource_views (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('view', 'open')),
  created_at timestamptz not null default now()
);
create index if not exists resource_views_resource_idx on public.resource_views (resource_id, created_at desc);
create index if not exists resource_views_dedupe_idx on public.resource_views (user_id, resource_id, kind, created_at desc);
alter table public.resource_views enable row level security;

-- S2-13 Admin-editable recommendation rules (a single row) and their change history.
create table if not exists public.recommendation_settings (
  id smallint primary key default 1 check (id = 1),
  weights jsonb not null,
  require_subject boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.recommendation_settings_history (
  id bigint generated always as identity primary key,
  weights jsonb not null,
  require_subject boolean not null,
  action text not null check (action in ('update', 'reset')),
  note text not null default '',
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.recommendation_settings enable row level security;
alter table public.recommendation_settings_history enable row level security;
create policy "Admins read recommendation settings" on public.recommendation_settings for select using (public.is_admin());
create policy "Admins read recommendation settings history" on public.recommendation_settings_history for select using (public.is_admin());
