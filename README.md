# Learning-Resources

IS 495 project: Personalized Learning Resource Recommendation Website.

**Stack:** React + TypeScript (Vite), Tailwind CSS, Node.js + Express, Supabase (database/auth), Vercel.

## Run it

```sh
npm install
npm run dev   # client on http://localhost:5173, API on http://localhost:3001
```

Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`, then fill in the Supabase keys.

## Layout

- `client/` React app (pages in `client/src/pages`)
- `server/` Express API (`server/src/index.ts`)
- `supabase/migrations/` database schema

## Sprint 1 task map

Search the code for `TODO(S1-..)` to find where each task goes.

| Story | Client | Server |
| --- | --- | --- |
| S1-01 Create an account | `pages/RegisterPage.tsx` (T01, T03) | `POST /api/auth/register` (T02) |
| S1-02 Sign in and sign out | `pages/LoginPage.tsx`, `components/Navbar.tsx` (T01, T03), `App.tsx` protected routes (T02, T03) | Supabase Auth |
| S1-03 Change password | `pages/ChangePasswordPage.tsx` (T01, T03) | `POST /api/account/password` (T02) |
| S1-04 Update profile | `pages/ProfilePage.tsx` (T01, T03) | `GET/PATCH /api/profile` (T02) |

The T04 "verify" tasks don't have test files yet.
