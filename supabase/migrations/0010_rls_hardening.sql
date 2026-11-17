-- Clears the Supabase security + performance advisor warnings.
-- The app reads/writes tables through the server (service role, bypasses RLS);
-- these policies are defense in depth for anyone holding the anon key.
--   * policies apply to `authenticated` only (anon gets nothing)
--   * auth.uid() / is_admin() wrapped in (select ...) so they run once per query, not per row
--   * one permissive policy per table+action (owner OR admin) instead of several
--   * trigger functions are no longer callable over /rest/v1/rpc

-- Functions -------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- profiles --------------------------------------------------------------------
drop policy "Users can read own profile" on public.profiles;
drop policy "Admins can read all profiles" on public.profiles;
create policy "Read own profile or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- resources -------------------------------------------------------------------
drop policy "Anyone signed in can read published resources" on public.resources;
drop policy "Owners can read own resources" on public.resources;
drop policy "Owners can create resources" on public.resources;
drop policy "Owners can update own resources" on public.resources;
drop policy "Admins can manage all resources" on public.resources;
create policy "Read published, own, or admin" on public.resources
  for select to authenticated
  using (status = 'published' or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Create own or admin" on public.resources
  for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Update own or admin" on public.resources
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins delete resources" on public.resources
  for delete to authenticated
  using ((select public.is_admin()));

-- lists / list_items / favorites ----------------------------------------------
drop policy "Owners manage own lists" on public.lists;
create policy "Owners manage own lists" on public.lists
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy "Owners manage own list items" on public.list_items;
create policy "Owners manage own list items" on public.list_items
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())));

drop policy "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- feedback / reports / notifications ------------------------------------------
drop policy "Users manage own feedback" on public.resource_feedback;
create policy "Users manage own feedback" on public.resource_feedback
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "Users can file reports" on public.reports;
drop policy "Users can read own reports" on public.reports;
drop policy "Admins manage reports" on public.reports;
create policy "File own report or admin" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "Read own reports or admin" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update reports" on public.reports
  for update to authenticated using ((select public.is_admin()));
create policy "Admins delete reports" on public.reports
  for delete to authenticated using ((select public.is_admin()));

drop policy "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- questionnaire ---------------------------------------------------------------
drop policy "Users manage own questionnaire responses" on public.questionnaire_responses;
create policy "Users manage own questionnaire responses" on public.questionnaire_responses
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "Users read own snapshots" on public.questionnaire_snapshots;
create policy "Users read own snapshots" on public.questionnaire_snapshots
  for select to authenticated using (user_id = (select auth.uid()));

-- support_requests ------------------------------------------------------------
drop policy "Users read own support requests" on public.support_requests;
drop policy "Admins manage support requests" on public.support_requests;
create policy "Read own support requests or admin" on public.support_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins create support requests" on public.support_requests
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update support requests" on public.support_requests
  for update to authenticated using ((select public.is_admin()));
create policy "Admins delete support requests" on public.support_requests
  for delete to authenticated using ((select public.is_admin()));

-- admin-only operational tables -----------------------------------------------
drop policy "Admins read uptime checks" on public.uptime_checks;
create policy "Admins read uptime checks" on public.uptime_checks
  for select to authenticated using ((select public.is_admin()));
drop policy "Admins read usage events" on public.usage_events;
create policy "Admins read usage events" on public.usage_events
  for select to authenticated using ((select public.is_admin()));
drop policy "Admins read error logs" on public.error_logs;
create policy "Admins read error logs" on public.error_logs
  for select to authenticated using ((select public.is_admin()));
drop policy "Admins read alerts" on public.alerts;
create policy "Admins read alerts" on public.alerts
  for select to authenticated using ((select public.is_admin()));
drop policy "Admins read recommendation settings" on public.recommendation_settings;
create policy "Admins read recommendation settings" on public.recommendation_settings
  for select to authenticated using ((select public.is_admin()));
drop policy "Admins read recommendation settings history" on public.recommendation_settings_history;
create policy "Admins read recommendation settings history" on public.recommendation_settings_history
  for select to authenticated using ((select public.is_admin()));
