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
npm test             # server tests (vitest + supertest)
```

Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`, then fill them from `npx supabase status`:

- `VITE_SUPABASE_URL` / `SUPABASE_URL`: `API_URL` (http://127.0.0.1:54321)
- `VITE_SUPABASE_ANON_KEY`: `ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: `SERVICE_ROLE_KEY` (server only, never in the client)

Local tools: Studio (browse tables) http://127.0.0.1:54323, Mailpit (sign-up and reset emails) http://127.0.0.1:54324.
After adding a migration, run `npx supabase db reset` to rebuild the local database from scratch.

## Layout

- `client/src/pages` pages (`educator/`, `admin/` subfolders), `client/src/components` shared widgets
- `client/src/lib/vocabulary.ts` subject/level/medium/goal values shared by forms and matching
- `server/src/app.ts` Express app, `server/src/routes/*.ts` one router per area
- `server/src/sprint1.test.ts` one `it.todo` per T04 verify task
- `supabase/migrations/` database schema

Every unfinished page renders a stub that names its tasks, and every unfinished API route returns `501 Not implemented yet (S1-..)`.

## Sprint 1 task map

Search the code for `TODO(S1-..)` (or the task id) to find where each task goes. All T04 verify tasks start as todos in `server/src/sprint1.test.ts`.

| Story | Client | Server | Schema |
| --- | --- | --- | --- |
| S1-01 Create an account | `pages/RegisterPage.tsx` | `POST /api/auth/register` | `0001_profiles` |
| S1-02 Sign in and sign out | `pages/LoginPage.tsx`, `components/Navbar.tsx`, `App.tsx` ProtectedRoute | Supabase Auth | |
| S1-03 Change password | `pages/ChangePasswordPage.tsx` | `POST /api/account/password` | |
| S1-04 Update profile | `pages/ProfilePage.tsx` | `GET/PATCH /api/profile` | `0001_profiles` |
| S1-05 Password reset | `pages/ForgotPasswordPage.tsx`, `pages/ResetPasswordPage.tsx` | Supabase Auth email (T02: SMTP + redirect URL) | |
| S1-06 First-login walkthrough | `components/Walkthrough.tsx` | `POST /api/profile/walkthrough-complete` | `0002_roles` |
| S1-07 Questionnaire | `pages/QuestionnairePage.tsx`, `pages/RecommendationsPage.tsx` | `POST /api/questionnaire`, `GET /api/recommendations` | `0006_questionnaire` |
| S1-08 Favorite / unfavorite | `components/FavoriteButton.tsx` | `POST/DELETE /api/favorites` | `0004_lists_favorites` |
| S1-09 Rate / feedback | `components/FeedbackForm.tsx` on `pages/ResourcePage.tsx` | `POST /api/resources/:id/feedback` | `0005_feedback_reports` |
| S1-10 Report broken resource | `components/ReportForm.tsx` on `pages/ResourcePage.tsx` | `POST /api/resources/:id/reports` | `0005_feedback_reports` |
| S1-11 Professor questionnaire | `pages/QuestionnairePage.tsx`, `pages/RecommendationsPage.tsx`, `Navbar.tsx` | role checks | `0002_roles` |
| S1-12 Professor library | `pages/LibraryPage.tsx` | `GET /api/library` | `0003_resources` |
| S1-13 Name and edit a list | `pages/ListsPage.tsx`, `pages/ListEditPage.tsx` | `/api/lists`, `/api/lists/:id`, `/api/lists/:id/items` | `0004_lists_favorites` |
| S1-14 Remove from a list | `pages/ListEditPage.tsx` | `DELETE /api/lists/:id/items/:resourceId` | |
| S1-15 Share a list | `pages/ListEditPage.tsx`, `pages/SharedListPage.tsx` | `POST /api/lists/:id/share`, `GET /api/shared/:token` | `lists.share_token` |
| S1-16 Upload resources | `pages/educator/ResourceFormPage.tsx` | `POST /api/resources` | `0003_resources`, `resource-files` bucket |
| S1-17 Tag resources | `lib/vocabulary.ts`, `ResourceFormPage.tsx` | `POST/PATCH /api/resources` | `resources.subject/level/medium` |
| S1-18 Edit resources | `pages/educator/ResourceFormPage.tsx` | `GET/PATCH /api/resources/:id` | |
| S1-19 My Submissions | `pages/educator/MySubmissionsPage.tsx` | `GET /api/resources/mine` | |
| S1-20 Clone a resource | `pages/educator/MySubmissionsPage.tsx`, `ResourceFormPage.tsx` | `POST /api/resources/:id/clone` | `resources.cloned_from` |
| S1-21 Save as draft | `pages/educator/ResourceFormPage.tsx` | `POST /api/resources/:id/submit`, published-only filters | `resources.status` |
| S1-22 Flag notifications | `pages/educator/NotificationsPage.tsx` | `GET /api/notifications`, `PATCH /api/notifications/:id/read` | `notifications` |
| S1-23 Manage user access | `pages/admin/AdminUsersPage.tsx` | `GET /api/admin/users`, `PATCH .../status` | `profiles.account_status` |
| S1-24 Manage collection | `pages/admin/AdminResourcesPage.tsx` | `/api/admin/resources` | |
| S1-25 Approve / reject | `pages/admin/AdminSubmissionsPage.tsx` | `POST /api/admin/submissions/:id/approve\|reject` | |
| S1-26 Pending submissions | `pages/admin/AdminSubmissionsPage.tsx` | `GET /api/admin/submissions` | |
| S1-27 Review flagged content | `pages/admin/AdminReportsPage.tsx` | `GET /api/admin/reports`, `POST .../resolve` | `reports` |
| S1-28 Assign roles | `pages/admin/AdminUsersPage.tsx`, route guards in `App.tsx` | `PATCH /api/admin/users/:id/role`, admin router guard | `0002_roles` |
| S1-29 Uptime and performance | `pages/admin/AdminMonitoringPage.tsx` | `GET /api/health`, `GET /api/admin/monitoring` | |
| S1-30 Usage analytics | `pages/admin/AdminAnalyticsPage.tsx` | `GET /api/admin/analytics`, event recording in `app.ts` | `usage_events` |
| S1-31 Error logs | `pages/admin/AdminErrorLogsPage.tsx` | `GET /api/admin/errors`, error middleware in `app.ts` | `error_logs` |
| S1-32 Outage alerts | `pages/admin/AdminMonitoringPage.tsx` | alert rules in `app.ts` | `alerts` |
| S1-33 Learning goal | `lib/vocabulary.ts`, `pages/QuestionnairePage.tsx` | `GET /api/recommendations` ranking | `questionnaire_responses.goal`, `resources.goals` |
| S1-34 Why recommended | `pages/RecommendationsPage.tsx` | `GET /api/recommendations` evidence | |
| S1-35 Closest matches | `pages/RecommendationsPage.tsx` | `GET /api/recommendations` fallback | |
| S1-36 My Favorites | `pages/FavoritesPage.tsx` | `GET /api/favorites` | `favorites` |
