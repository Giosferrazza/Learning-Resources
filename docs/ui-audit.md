# UI audit, start of Sprint 2 (S2-01-T01-S1)

What was inconsistent across pages and what Sprint 2 changed. See `style-guide.md` for the rules.

| Area | Finding | Fix |
| --- | --- | --- |
| Navigation | Admin top bar listed 4 of 10 admin pages; the rest were only reachable from the dashboard | Admin side navigation on every admin page (`App.tsx`), top bar keeps the 4 most used |
| Navigation | Active link shown by color only | Active link is also underlined; side nav highlights with background and weight |
| Navigation | No way back up from detail pages | Breadcrumbs on resource, list, questionnaire, history, engagement and admin pages |
| Navigation | Notifications only for educators and admins | Bell for every role; also in the account menu |
| Labels | Student nav said "Find resources" for the questionnaire, professors "Plan a lesson" | "My questionnaires" / "Lesson plans" lead to one hub page |
| Labels | Library search placeholder "Title contains…" but search was title-only | Searches title and description; placeholder "Title or description" |
| Filters | Recommendations had format chips, the library had dropdowns | One `FilterBar` (subject, level, format, clear) on both, kept in the URL |
| Buttons | Recommendation cards had no direct way to open a resource | Every curated card has "Open resource" and "Details" |
| States | Pages mixed inline red text, `LoadError` and nothing at all on failure | `ErrorState` with retry for page-level failures; `Empty` for every empty list with a next step |
| Spacing | Page padding varied (py-8 vs none) and tables overflowed on phones | `Page` handles padding; `TableWrap` scrolls tables |
| Help | No support page; the footer had one link | `/support` for everyone, linked from footer and account menu |
