// Local demo data: one account per role plus a library of published resources.
// Run with `npm run seed` after `npx supabase start` (safe to run more than once).
import { db } from '../src/lib/supabase'

const PASSWORD = 'demo-password-1' // local demo accounts only

const people = [
  { email: 'admin@demo.test', name: 'Avery Admin', role: 'admin' },
  { email: 'educator@demo.test', name: 'Eli Educator', role: 'educator' },
  { email: 'professor@demo.test', name: 'Priya Professor', role: 'professor' },
  { email: 'student@demo.test', name: 'Sam Student', role: 'student' },
] as const

type Seed = [title: string, subject: string, level: string, medium: string, goals: string[], url: string, description: string]

const resources: Seed[] = [
  ['Python for Absolute Beginners', 'python', 'beginner', 'video', ['class', 'curiosity'], 'https://www.youtube.com/results?search_query=python+for+beginners', 'A gentle video introduction to variables, loops and functions.'],
  ['Automate the Boring Stuff with Python', 'python', 'beginner', 'article', ['career', 'curiosity'], 'https://automatetheboringstuff.com/', 'Free online book on practical Python scripting.'],
  ['Python Tutor', 'python', 'beginner', 'tool', ['class', 'exam'], 'https://pythontutor.com/', 'Step through code and see what each line does.'],
  ['Intermediate Python: Classes and Modules', 'python', 'intermediate', 'video', ['class', 'career'], 'https://docs.python.org/3/tutorial/classes.html', 'Object-oriented Python with worked examples.'],
  ['Python Exam Review: Data Structures', 'python', 'intermediate', 'article', ['exam'], 'https://docs.python.org/3/tutorial/datastructures.html', 'Lists, dictionaries and sets, with practice questions.'],
  ['Advanced Python Performance', 'python', 'advanced', 'article', ['career'], 'https://docs.python.org/3/howto/perf_profiling.html', 'Profiling and speeding up real programs.'],
  ['Excel Basics in 20 Minutes', 'excel', 'beginner', 'video', ['class', 'career'], 'https://support.microsoft.com/excel', 'Cells, formulas and formatting for first-timers.'],
  ['PivotTables Explained', 'excel', 'intermediate', 'article', ['career', 'exam'], 'https://support.microsoft.com/office/pivottables', 'Summarize big tables in a few clicks.'],
  ['Excel Formula Builder', 'excel', 'intermediate', 'tool', ['career'], 'https://support.microsoft.com/office/excel-functions', 'Reference for every built-in Excel function.'],
  ['Statistics Crash Course', 'statistics', 'beginner', 'video', ['class', 'exam'], 'https://www.khanacademy.org/math/statistics-probability', 'Mean, median, spread and probability basics.'],
  ['Hypothesis Testing Step by Step', 'statistics', 'intermediate', 'article', ['exam', 'class'], 'https://www.khanacademy.org/math/statistics-probability/significance-tests-one-sample', 'Null hypotheses, p-values and when to reject.'],
  ['Regression Calculator', 'statistics', 'intermediate', 'tool', ['class'], 'https://www.desmos.com/calculator', 'Plot data and fit lines interactively.'],
  ['HTML and CSS for Beginners', 'web-development', 'beginner', 'article', ['career', 'curiosity'], 'https://developer.mozilla.org/en-US/docs/Learn', "MDN's beginner path to building web pages."],
  ['React in 100 Minutes', 'web-development', 'intermediate', 'video', ['career'], 'https://react.dev/learn', 'Components, state and hooks in one sitting.'],
  ['SQL Basics', 'databases', 'beginner', 'article', ['class', 'career'], 'https://www.sqlitetutorial.net/', 'SELECT, WHERE and JOIN with practice queries.'],
  ['Database Design Fundamentals', 'databases', 'intermediate', 'video', ['class', 'exam'], 'https://www.postgresql.org/docs/current/ddl.html', 'Tables, keys and normalization.'],
  ['Data Analysis with Spreadsheets', 'data-analysis', 'beginner', 'video', ['career'], 'https://support.google.com/docs', 'Clean, sort and chart a dataset.'],
  ['Business Writing Essentials', 'business', 'beginner', 'article', ['career'], 'https://owl.purdue.edu/owl/subject_specific_writing/professional_technical_writing/', 'Clear emails, memos and reports.'],
  ['Design Principles Toolkit', 'design', 'beginner', 'tool', ['curiosity', 'career'], 'https://www.figma.com/resource-library/design-principles/', 'Contrast, hierarchy and alignment with examples.'],
]

async function ensureUser(p: (typeof people)[number]) {
  const { data: existing } = await db.from('profiles').select('id').eq('email', p.email).maybeSingle()
  let id = existing?.id as string | undefined
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email: p.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: p.name, role: p.role === 'admin' ? 'student' : p.role },
    })
    if (error) throw error
    id = data.user.id
  }
  // Mark the walkthrough done for everyone but the student so demos start clean
  await db
    .from('profiles')
    .update({ role: p.role, display_name: p.name, walkthrough_completed_at: p.role === 'student' ? null : new Date().toISOString() })
    .eq('id', id)
  return id
}

const ids = Object.fromEntries(await Promise.all(people.map(async (p) => [p.role, await ensureUser(p)])))

const { count } = await db.from('resources').select('id', { count: 'exact', head: true }).eq('owner_id', ids.educator)
if (!count) {
  const now = Date.now()
  const rows = resources.map(([title, subject, level, medium, goals, url, description], i) => ({
    owner_id: ids.educator,
    title,
    subject,
    level,
    medium,
    goals,
    url,
    description,
    status: 'published',
    submitted_at: new Date(now - (i + 2) * 86_400_000).toISOString(),
    reviewed_at: new Date(now - (i + 1) * 86_400_000).toISOString(),
    reviewed_by: ids.admin,
    created_at: new Date(now - (i + 2) * 86_400_000).toISOString(),
  }))
  const { error } = await db.from('resources').insert(rows)
  if (error) throw error
  // One waiting for review so the admin queue isn't empty
  await db.from('resources').insert({
    owner_id: ids.educator,
    title: 'Intro to Pandas DataFrames',
    subject: 'data-analysis',
    level: 'intermediate',
    medium: 'article',
    goals: ['career'],
    url: 'https://pandas.pydata.org/docs/getting_started/',
    description: 'Load, filter and summarize tabular data in Python.',
    status: 'pending',
    submitted_at: new Date().toISOString(),
  })
}

console.log(`Seeded ${people.length} demo accounts (password in server/scripts/seed.ts) and ${resources.length} published resources.`)
