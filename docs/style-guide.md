# Resource Learning style guide (S2-01-T01-S2)

One look and one set of words across student, professor, educator and admin pages. Build from `client/src/components/ui.tsx`; don't hand-style a button, field or state on a page.

## Colors (Tailwind tokens in `client/src/index.css`)

| Token | Hex | Use |
| --- | --- | --- |
| `rl-navy` / `rl-navy-deep` | #14213d / #0b1426 | Top bar, footer |
| `rl-teal` / `rl-teal-dark` | #1fb5a8 / #15897f | Primary buttons, links, active navigation, selected chips |
| `rl-gold` | #fca311 | Ratings and unread counts only |
| `rl-light` | #f4f7fb | Soft panels inside cards (explanations, comments) |
| `rl-text` | #1d2733 | Body text |
| slate-500 / 600 | | Secondary text, hints, timestamps |
| red / amber / emerald / sky (50, 200, 800) | | Error / warning / success / info alerts and pills |

Never use color alone for meaning: active nav links are also underlined, unread notifications also have a dot with an "Unread" label, status pills carry words.

## Type

System sans-serif via Tailwind. Page title `text-2xl font-bold` (one per page, from `Page`). Section title `font-semibold` (`h2`). Body `text-sm` inside cards, hints `text-xs text-slate-500`. Numbers in tables and stats use `tabular-nums`.

## Layout

- Every page renders inside `Page` (title, optional subtitle, actions on the right, optional `breadcrumbs`). Widths: `narrow` for forms (max-w-md), default for content (max-w-5xl), `wide` for dashboards.
- Sections with several pages (Admin, educator Reports) use `WithSideNav` + `SideNav`; on phones the side nav becomes a horizontal scrolling row.
- Cards: `Card` (white, rounded-xl, border-slate-200, p-5). Grids are one column on phones, two from `md`.
- Tables sit in `TableWrap` so they scroll sideways on phones instead of widening the page.
- Gutters: 16px (`px-4`) on every page; nothing may cause horizontal page scroll at 360px wide.

## Controls

| Component | When |
| --- | --- |
| `Button` variant `primary` | The one main action of a card or page |
| `secondary` | Other actions |
| `ghost` | Low-emphasis actions in a row (Retake, Cancel) |
| `danger` / `ConfirmButton` | Destructive actions; always two-step, never a browser dialog |
| `Field`, `TextArea`, `Select`, `Checkboxes` | All forms; label above, hint or error below |
| `FilterBar` | Subject, level and format filters with "Clear filters"; state lives in the URL |

Buttons show a spinner while busy (`busy`), and forms validate on submit with the message under the field.

## States

| State | Component | Wording |
| --- | --- | --- |
| Loading | `Loading` | "Loading…" or what is happening ("Finding your matches…") |
| Empty | `Empty` with icon, title, next step | Say what is missing and offer the next action |
| Error | `ErrorState` (whole page/section) or `LoadError` / `Alert kind="error"` (inline) | The server's message plus "Try again" |
| Success | `Alert kind="success"` | Past tense, what happened and where to find it |

## Words

- Roles: Student, Professor, Educator, Admin (capitalized only as labels).
- "Resource" (not item/content), "format" (video, article, tool; not medium/type in the UI), "level", "subject", "goal".
- "Favorites", "My lists", "My questionnaires", "Past results", "Reports", "Help and support".
- Buttons are verbs: "Save rules", "Export list", "Mark resolved", "Clear filters".
- Sentence case everywhere.
