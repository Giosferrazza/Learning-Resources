# Learning-Resources

IS 495 project: Personalized Learning Resource Recommendation Website.

**Stack:** React + TypeScript (Vite), Tailwind CSS, Node.js + Express, Supabase (database/auth), Vercel.

## Run it

Needs Node 22+ and Docker Desktop (running). The Supabase CLI comes with `npm install`.

```sh
npm install
npx supabase start   # local Postgres/Auth/Storage in Docker; applies supabase/migrations
npx supabase status  # prints the local URL and keys
npm run dev          # client on http://localhost:5173, API on http://localhost:3001
npm test             # server tests (needs local Supabase running)
```

Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`, then fill them from `npx supabase status`:

- `VITE_SUPABASE_URL` / `SUPABASE_URL`: `API_URL` (http://127.0.0.1:54321)
- `VITE_SUPABASE_ANON_KEY`: `ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: `SERVICE_ROLE_KEY` (server only, never in the client)

Local tools: Studio (browse tables) http://127.0.0.1:54323, Mailpit (sign-up and reset emails) http://127.0.0.1:54324.
After adding a migration, run `npx supabase db reset` to rebuild the local database from scratch.

## Demo data

```sh
npm run seed   # demo accounts (one per role) + 20 resources, safe to rerun
```

Demo logins are `admin@demo.test`, `educator@demo.test`, `professor@demo.test` and `student@demo.test`; the shared password is in `server/scripts/seed.ts`. The student account shows the first-login walkthrough.

## What each role can do

| Role | Home | Can |
| --- | --- | --- |
| Student | Recommendations | Questionnaire, recommendations with explanations, favorites, saved lists, ratings, reports |
| Professor | Library | Everything a student can, plus the full library and shareable read-only lists |
| Educator | My submissions | Upload (link or file), tag, save drafts, submit for review, edit, clone; flag and review notifications |
| Admin | Dashboard | Review submissions, moderate reports, manage users/roles and the collection, monitoring, analytics, error logs |

People choose student, professor or educator at sign-up. Only an admin can make someone an admin.

## Layout

- `shared/vocabulary.ts` subjects, levels, formats and goals, used by the client forms and the server's validation and matching
- `client/src/pages` pages (`educator/`, `admin/`), `client/src/components` shared UI, `client/src/auth` session and favorites state
- `server/src/routes/*.ts` one router per area; `server/src/lib` auth, recommendations, alerts, monitoring, error logging
- `server/src/sprint1.test.ts` integration tests for every T04 task; `server/src/lib/recommend.test.ts` matching rules
- `supabase/migrations/` schema; `supabase/config.toml` local Supabase settings

## Optional YouTube discovery

The recommendations page can find live YouTube videos using the saved questionnaire and an optional specific learning focus. Set the server-side `YOUTUBE_API_KEY` for YouTube Data API v3. Set `OPENAI_API_KEY` to generate improved search queries via the OpenAI Responses API; otherwise rule-based queries are used. Keep API keys outside Vite/client variables. Video results are not educator-reviewed and cannot yet be saved to favorites.

## How it works

- **Auth (S1-01 to S1-05):** Supabase Auth in the browser; a database trigger creates the profile at sign-up. The API checks the access token and reloads the profile on every request, so role changes and suspensions apply immediately. Password reset emails land in Mailpit locally.
- **Recommendations (S1-07, S1-33 to S1-35):** rules are documented at the top of `server/src/lib/recommend.ts`. Only published resources in the chosen subject are eligible. Exact matches (level and format) are shown when any exist; otherwise the closest matches, ranked by level distance, format, and goal. Every result lists why it matched.
- **Review lifecycle (S1-16 to S1-21, S1-25, S1-26):** draft → pending → published or rejected. Submitting needs a link or file plus all three tags. Editing a published resource sends it back to review.
- **Moderation (S1-10, S1-22, S1-24, S1-27):** reports notify the resource owner; admins resolve or dismiss them and can remove the resource. Removed resources stay in favorites and lists as "no longer available".
- **Operations (S1-29 to S1-32):** `/api/health` checks the database; the API records a check every minute. Two failures in a row raise an outage alert, the next pass a recovery alert; critical errors and error spikes alert too. Alerts go to every admin's notifications and to `ALERT_WEBHOOK_URL` (Slack/Discord) when set, at most once per 15 minutes per alert. Errors are logged with passwords, tokens and keys redacted.

## Sprint 1 map

| Story | Client | Server |
| --- | --- | --- |
| S1-01 Create an account | `pages/RegisterPage.tsx` | sign-up trigger in `0002_roles.sql` |
| S1-02 Sign in and sign out | `pages/LoginPage.tsx`, account menu in `Navbar.tsx`, `RequireAuth.tsx` | `lib/auth.ts` |
| S1-03 Change password | `pages/ChangePasswordPage.tsx` | `POST /api/account/password` |
| S1-04 Update profile | `pages/AccountPage.tsx` | `PATCH /api/profile` |
| S1-05 Password reset | `pages/ForgotPasswordPage.tsx`, `pages/ResetPasswordPage.tsx` | Supabase Auth email |
| S1-06 First-login walkthrough | `components/Walkthrough.tsx` | `POST /api/profile/walkthrough-complete` |
| S1-07 Questionnaire | `pages/QuestionnairePage.tsx`, `pages/RecommendationsPage.tsx` | `POST /api/questionnaire`, `GET /api/recommendations` |
| S1-08 Favorite / unfavorite | `components/FavoriteButton.tsx`, "Save this list" | `POST/DELETE /api/favorites` |
| S1-09 Rate / feedback | `components/FeedbackForm.tsx` | `POST /api/resources/:id/feedback` |
| S1-10 Report a resource | `components/ReportForm.tsx` | `POST /api/resources/:id/reports` |
| S1-11 Professor questionnaire | professor wording + "Add to list" | role checks in `lib/auth.ts` |
| S1-12 Professor library | `pages/LibraryPage.tsx` | `GET /api/library` |
| S1-13 Name and edit a list | `pages/ListsPage.tsx`, `pages/ListEditPage.tsx`, `components/AddToList.tsx` | `/api/lists` |
| S1-14 Remove from a list | `pages/ListEditPage.tsx` | `DELETE /api/lists/:id/items/:resourceId` |
| S1-15 Share a list | `pages/ListEditPage.tsx`, `pages/SharedListPage.tsx` | `POST/DELETE /api/lists/:id/share`, `GET /api/shared/:token` |
| S1-16 Upload resources | `pages/educator/ResourceFormPage.tsx` | `POST /api/resources`, `resource-files` bucket |
| S1-17 Tag resources | `shared/vocabulary.ts`, `ResourceFormPage.tsx` | validation in `routes/resources.ts` |
| S1-18 Edit resources | `ResourceFormPage.tsx` | `PATCH /api/resources/:id` |
| S1-19 My Submissions | `pages/educator/MySubmissionsPage.tsx` | `GET /api/resources/mine` |
| S1-20 Clone a resource | `MySubmissionsPage.tsx` | `POST /api/resources/:id/clone` |
| S1-21 Save as draft | `ResourceFormPage.tsx` | `POST /api/resources/:id/submit` |
| S1-22 Flag notifications | `pages/educator/NotificationsPage.tsx`, bell in `Navbar.tsx` | `/api/notifications` |
| S1-23 Manage user access | `pages/admin/AdminUsersPage.tsx` | `PATCH /api/admin/users/:id/status` |
| S1-24 Manage collection | `pages/admin/AdminResourcesPage.tsx` | `/api/admin/resources` |
| S1-25 Approve / reject | `pages/admin/AdminSubmissionsPage.tsx` | `POST /api/admin/submissions/:id/approve\|reject` |
| S1-26 Pending submissions | `AdminSubmissionsPage.tsx` | `GET /api/admin/submissions` |
| S1-27 Review flagged content | `pages/admin/AdminReportsPage.tsx` | `/api/admin/reports` |
| S1-28 Assign roles | `AdminUsersPage.tsx`, route guards in `App.tsx` | `PATCH /api/admin/users/:id/role` |
| S1-29 Uptime and performance | `pages/admin/AdminMonitoringPage.tsx` | `GET /api/health`, `lib/monitor.ts` |
| S1-30 Usage analytics | `pages/admin/AdminAnalyticsPage.tsx` | `GET /api/admin/analytics`, `lib/events.ts` |
| S1-31 Error logs | `pages/admin/AdminErrorLogsPage.tsx` | `GET /api/admin/errors`, `lib/errorLog.ts` |
| S1-32 Outage alerts | `AdminMonitoringPage.tsx` | `lib/alerts.ts` |
| S1-33 Learning goal | `QuestionnairePage.tsx` | goal ranking in `lib/recommend.ts` |
| S1-34 Why recommended | `RecommendationsPage.tsx` | `reasons` in `lib/recommend.ts` |
| S1-35 Closest matches | `RecommendationsPage.tsx` | fallback in `lib/recommend.ts` |
| S1-36 My Favorites | `pages/FavoritesPage.tsx` | `GET /api/favorites` |
