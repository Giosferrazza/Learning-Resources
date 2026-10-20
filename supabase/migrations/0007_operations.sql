-- S1-30-T01 / S1-31-T01 / S1-32: usage events, error logs, alerts (admin-only reads)
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null, -- TODO(S1-30-T01): fix the list of event types
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id bigint generated always as identity primary key,
  level text not null default 'error', -- error | critical
  message text not null,
  route text,
  user_id uuid references public.profiles (id) on delete set null,
  context jsonb not null default '{}', -- never store passwords or tokens here (S1-31-T01)
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id bigint generated always as identity primary key,
  rule text not null, -- outage | critical_error
  message text not null,
  dedupe_key text not null, -- S1-32-T03 duplicate suppression
  delivery_status text not null default 'pending', -- pending | sent | failed
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_type_idx on public.usage_events (event_type, created_at);
create index if not exists error_logs_created_idx on public.error_logs (created_at desc);
create index if not exists alerts_dedupe_idx on public.alerts (dedupe_key, created_at desc);

alter table public.usage_events enable row level security;
alter table public.error_logs enable row level security;
alter table public.alerts enable row level security;

-- Writes come from the API with the service role; only admins read.
create policy "Admins read usage events" on public.usage_events for select using (public.is_admin());
create policy "Admins read error logs" on public.error_logs for select using (public.is_admin());
create policy "Admins read alerts" on public.alerts for select using (public.is_admin());
