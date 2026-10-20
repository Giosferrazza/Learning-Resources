-- S1-09-T02 / S1-10-T02 / S1-22-T01 / S1-27-T01: ratings, reports, educator notifications
create table if not exists public.resource_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  reason text not null, -- e.g. broken_link, inaccurate, inappropriate
  details text not null default '',
  status public.report_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null, -- e.g. content_flagged
  resource_id uuid references public.resources (id) on delete cascade,
  report_id uuid references public.reports (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.resource_feedback enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create policy "Users manage own feedback" on public.resource_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can file reports" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "Users can read own reports" on public.reports
  for select using (auth.uid() = reporter_id);

create policy "Admins manage reports" on public.reports
  for all using (public.is_admin());

-- TODO(S1-22-T03): users may only flip read_at, not rewrite the message
create policy "Users manage own notifications" on public.notifications
  for all using (auth.uid() = user_id);

-- TODO(S1-22-T01): create a content_flagged notification for the resource owner when a report is filed
