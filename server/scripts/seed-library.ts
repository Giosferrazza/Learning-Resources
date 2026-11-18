// Grows the published library so every subject has resources at each level and format,
// and recommendations return a full page instantly (no web search needed).
// Safe to run more than once: resources whose URL is already in the library are skipped.
//
// Local:  npm run seed:library
// Hosted: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:library
// Options: --owner <email> (default educator@demo.test), --reviewer <email> (default admin@demo.test)
import { db } from '../src/lib/supabase.js'

const flag = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : fallback
}
const ownerEmail = flag('--owner', 'educator@demo.test')
const reviewerEmail = flag('--reviewer', 'admin@demo.test')

type Seed = [title: string, subject: string, level: string, medium: string, goals: string[], url: string, description: string]

const library: Seed[] = [
  // Statistics
  ['Khan Academy: Statistics and Probability', 'statistics', 'beginner', 'video', ['class', 'exam'], 'https://www.khanacademy.org/math/statistics-probability', 'Short video lessons with practice, from data displays to inference.'],
  ['Statistics How To', 'statistics', 'beginner', 'article', ['class', 'exam'], 'https://www.statisticshowto.com/', 'Plain-language explanations of common statistics terms and tests.'],
  ['Seeing Theory', 'statistics', 'beginner', 'tool', ['class', 'curiosity'], 'https://seeing-theory.brown.edu/', 'Interactive visuals of probability and statistics concepts.'],
  ['StatQuest with Josh Starmer', 'statistics', 'intermediate', 'video', ['class', 'career', 'curiosity'], 'https://www.youtube.com/@statquest', 'Clear, step-by-step videos on statistics and machine learning.'],
  ['OpenIntro Statistics', 'statistics', 'intermediate', 'article', ['class', 'exam'], 'https://www.openintro.org/book/os/', 'Free, full introductory statistics textbook with exercises.'],
  ['StatKey', 'statistics', 'intermediate', 'tool', ['class', 'exam'], 'https://www.lock5stat.com/StatKey/', 'Run bootstrap and randomization tests in the browser.'],
  ['MIT 18.650 Statistics for Applications', 'statistics', 'advanced', 'video', ['class', 'exam'], 'https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/', 'Full MIT lecture course on statistical theory and methods.'],
  ['An Introduction to Statistical Learning', 'statistics', 'advanced', 'article', ['class', 'career'], 'https://www.statlearning.com/', 'Free textbook on regression, classification and resampling.'],
  ['Penn State STAT 500: Applied Statistics', 'statistics', 'advanced', 'article', ['class', 'exam'], 'https://online.stat.psu.edu/stat500/', 'Graduate-level course notes on applied statistical methods.'],
  ['NIST Engineering Statistics Handbook', 'statistics', 'advanced', 'article', ['career'], 'https://www.itl.nist.gov/div898/handbook/', 'Reference handbook for choosing and applying statistical methods.'],
  ['JASP', 'statistics', 'advanced', 'tool', ['class', 'career'], 'https://jasp-stats.org/', 'Free desktop app for classical and Bayesian analyses.'],

  // Python
  ['The Official Python Tutorial', 'python', 'beginner', 'article', ['class', 'curiosity'], 'https://docs.python.org/3/tutorial/', 'The language tutorial from the Python documentation.'],
  ["CS50's Introduction to Programming with Python", 'python', 'beginner', 'video', ['class', 'career'], 'https://cs50.harvard.edu/python/', "Harvard's free lecture course on Python fundamentals."],
  ['Google Colab', 'python', 'beginner', 'tool', ['class', 'curiosity'], 'https://colab.research.google.com/', 'Write and run Python notebooks in the browser, nothing to install.'],
  ['Real Python', 'python', 'intermediate', 'article', ['career', 'class'], 'https://realpython.com/', 'In-depth tutorials on Python features and libraries.'],
  ['Corey Schafer Python Tutorials', 'python', 'intermediate', 'video', ['career'], 'https://www.youtube.com/@coreyms', 'Practical video tutorials on Python and its ecosystem.'],
  ['Exercism Python Track', 'python', 'intermediate', 'tool', ['exam', 'career'], 'https://exercism.org/tracks/python', 'Practice exercises with automated tests and mentor feedback.'],
  ['Python Design Patterns', 'python', 'advanced', 'article', ['career'], 'https://python-patterns.guide/', 'Classic design patterns explained the Pythonic way.'],
  ['PyCon US Talks', 'python', 'advanced', 'video', ['career', 'curiosity'], 'https://www.youtube.com/@PyConUS', 'Conference talks on advanced Python topics.'],

  // Excel
  ['GCFGlobal Excel Tutorials', 'excel', 'beginner', 'article', ['class', 'curiosity'], 'https://edu.gcfglobal.org/en/excel/', 'Free step-by-step lessons for Excel basics.'],
  ['Excel Practice Online', 'excel', 'beginner', 'tool', ['class', 'exam'], 'https://excel-practice-online.com/', 'Interactive Excel exercises that check your answers.'],
  ['Exceljet Formulas', 'excel', 'intermediate', 'article', ['career'], 'https://exceljet.net/formulas', 'Hundreds of formula examples with clear explanations.'],
  ['Leila Gharani', 'excel', 'intermediate', 'video', ['career'], 'https://www.youtube.com/@LeilaGharani', 'Video tutorials on Excel formulas, dashboards and automation.'],
  ['Chandoo.org', 'excel', 'intermediate', 'article', ['career'], 'https://chandoo.org/wp/', 'Excel tips, templates and dashboard techniques.'],
  ['ExcelIsFun', 'excel', 'advanced', 'video', ['class', 'career'], 'https://www.youtube.com/@excelisfun', 'Thousands of in-depth Excel videos, including full courses.'],
  ['Power Query Documentation', 'excel', 'advanced', 'article', ['career'], 'https://learn.microsoft.com/en-us/power-query/', 'Official guide to importing and shaping data with Power Query.'],
  ['Power BI Desktop', 'excel', 'advanced', 'tool', ['career'], 'https://www.microsoft.com/en-us/power-platform/products/power-bi/desktop', 'Free tool for modeling spreadsheet data into reports.'],

  // Web development
  ['MDN: Learn Web Development', 'web-development', 'beginner', 'article', ['class', 'career'], 'https://developer.mozilla.org/en-US/docs/Learn', 'Structured HTML, CSS and JavaScript lessons from MDN.'],
  ['Kevin Powell', 'web-development', 'beginner', 'video', ['class', 'career'], 'https://www.youtube.com/@KevinPowell', 'Friendly videos that make CSS make sense.'],
  ['freeCodeCamp', 'web-development', 'beginner', 'tool', ['career', 'curiosity'], 'https://www.freecodecamp.org/learn', 'Free interactive curriculum with projects and certifications.'],
  ['CodePen', 'web-development', 'beginner', 'tool', ['curiosity'], 'https://codepen.io/', 'Try HTML, CSS and JavaScript in the browser and see results live.'],
  ['The Modern JavaScript Tutorial', 'web-development', 'intermediate', 'article', ['class', 'exam'], 'https://javascript.info/', 'Thorough JavaScript guide from basics to advanced topics.'],
  ['The Odin Project', 'web-development', 'intermediate', 'article', ['career'], 'https://www.theodinproject.com/', 'Free full-stack curriculum built around real projects.'],
  ['Fireship', 'web-development', 'intermediate', 'video', ['career', 'curiosity'], 'https://www.youtube.com/@Fireship', 'Fast, dense videos on web tools and concepts.'],
  ['Patterns.dev', 'web-development', 'advanced', 'article', ['career'], 'https://www.patterns.dev/', 'Design, rendering and performance patterns for modern web apps.'],
  ['Chrome DevTools', 'web-development', 'advanced', 'tool', ['career'], 'https://developer.chrome.com/docs/devtools', 'Debug, profile and audit web pages in the browser.'],

  // Databases
  ['Khan Academy: Intro to SQL', 'databases', 'beginner', 'video', ['class', 'curiosity'], 'https://www.khanacademy.org/computing/computer-programming/sql', 'Beginner-friendly SQL lessons with in-browser challenges.'],
  ['SQLBolt', 'databases', 'beginner', 'tool', ['class', 'exam'], 'https://sqlbolt.com/', 'Interactive SQL lessons you complete in the browser.'],
  ['PostgreSQL Tutorial', 'databases', 'intermediate', 'article', ['class', 'career'], 'https://www.postgresql.org/docs/current/tutorial.html', 'The official tutorial from the PostgreSQL documentation.'],
  ['Mode SQL Tutorial', 'databases', 'intermediate', 'article', ['career'], 'https://mode.com/sql-tutorial/', 'SQL for analysis, from basic queries to window functions.'],
  ['SQLZoo', 'databases', 'intermediate', 'tool', ['exam'], 'https://sqlzoo.net/', 'Graded SQL exercises from simple selects to joins.'],
  ['DB Fiddle', 'databases', 'intermediate', 'tool', ['class', 'exam'], 'https://www.db-fiddle.com/', 'Build a schema and run queries against several databases online.'],
  ['CMU Intro to Database Systems', 'databases', 'advanced', 'video', ['class', 'exam'], 'https://15445.courses.cs.cmu.edu/', "Carnegie Mellon's database internals course, lectures included."],
  ['Use The Index, Luke', 'databases', 'advanced', 'article', ['career'], 'https://use-the-index-luke.com/', 'SQL indexing and query performance explained for developers.'],
  ['explain.dalibo.com', 'databases', 'advanced', 'tool', ['career'], 'https://explain.dalibo.com/', 'Visualize PostgreSQL query plans to find slow steps.'],

  // Data analysis
  ['Our World in Data', 'data-analysis', 'beginner', 'article', ['curiosity'], 'https://ourworldindata.org/', 'Research and charts on global problems, with the data behind them.'],
  ['Data School', 'data-analysis', 'beginner', 'video', ['career'], 'https://www.youtube.com/@dataschool', 'Beginner-friendly videos on pandas and data science.'],
  ['Kaggle Learn', 'data-analysis', 'beginner', 'tool', ['career', 'curiosity'], 'https://www.kaggle.com/learn', 'Short hands-on courses run in free notebooks.'],
  ['Python Data Science Handbook', 'data-analysis', 'intermediate', 'article', ['class', 'career'], 'https://jakevdp.github.io/PythonDataScienceHandbook/', 'Free book covering NumPy, pandas, Matplotlib and scikit-learn.'],
  ['R for Data Science', 'data-analysis', 'intermediate', 'article', ['class', 'career'], 'https://r4ds.hadley.nz/', 'Free book on importing, tidying and visualizing data in R.'],
  ['freeCodeCamp: Data Analysis with Python', 'data-analysis', 'intermediate', 'video', ['career', 'class'], 'https://www.freecodecamp.org/learn/data-analysis-with-python/', 'Video course and projects on analyzing data with Python.'],
  ['Tableau Public', 'data-analysis', 'intermediate', 'tool', ['career'], 'https://public.tableau.com/', 'Free tool for building and sharing interactive charts.'],
  ['Polars User Guide', 'data-analysis', 'advanced', 'article', ['career'], 'https://docs.pola.rs/', 'Fast DataFrame library guide for large datasets.'],
  ['SciPy Conference Talks by Enthought', 'data-analysis', 'advanced', 'video', ['career', 'curiosity'], 'https://www.youtube.com/@Enthought', 'SciPy conference talks and tutorials on scientific Python.'],
  ['Observable', 'data-analysis', 'advanced', 'tool', ['career', 'curiosity'], 'https://observablehq.com/', 'Notebooks for exploring data and building visualizations.'],

  // Business
  ['Investopedia', 'business', 'beginner', 'article', ['class', 'exam'], 'https://www.investopedia.com/', 'Definitions and explainers for finance and business terms.'],
  ['Khan Academy: Economics and Finance', 'business', 'beginner', 'video', ['class', 'exam'], 'https://www.khanacademy.org/economics-finance-domain', 'Video lessons on micro, macro, and finance basics.'],
  ['Harvard Business Review', 'business', 'intermediate', 'article', ['career'], 'https://hbr.org/', 'Articles on management, strategy and leadership.'],
  ['CFI Resources', 'business', 'intermediate', 'article', ['career', 'exam'], 'https://corporatefinanceinstitute.com/resources/', 'Guides on accounting, valuation and financial modeling.'],
  ['The Business Model Canvas', 'business', 'intermediate', 'tool', ['class', 'career'], 'https://www.strategyzer.com/library/the-business-model-canvas', 'One-page template for mapping how a business works.'],
  ['Aswath Damodaran on Valuation', 'business', 'advanced', 'video', ['career', 'class'], 'https://www.youtube.com/@AswathDamodaranonValuation', "NYU Stern professor's full valuation and corporate finance classes."],
  ["Damodaran Online", 'business', 'advanced', 'article', ['career', 'class'], 'https://pages.stern.nyu.edu/~adamodar/', 'Valuation data sets, spreadsheets and lecture notes.'],
  ['SEC EDGAR Full-Text Search', 'business', 'advanced', 'tool', ['career', 'curiosity'], 'https://www.sec.gov/edgar/search/', 'Search public company filings for real-world analysis.'],

  // Design
  ['Laws of UX', 'design', 'beginner', 'article', ['class', 'career'], 'https://lawsofux.com/', 'Key psychology principles behind good interface design.'],
  ['The Futur', 'design', 'beginner', 'video', ['career', 'curiosity'], 'https://www.youtube.com/@thefutur', 'Videos on design fundamentals, typography and the business of design.'],
  ['Figma', 'design', 'beginner', 'tool', ['career', 'curiosity'], 'https://www.figma.com/', 'Free browser-based tool for designing interfaces.'],
  ['Coolors', 'design', 'beginner', 'tool', ['curiosity'], 'https://coolors.co/', 'Generate and explore color palettes.'],
  ['Material Design 3', 'design', 'intermediate', 'article', ['career'], 'https://m3.material.io/', "Google's design system guidelines and components."],
  ['Apple Human Interface Guidelines', 'design', 'intermediate', 'article', ['career', 'class'], 'https://developer.apple.com/design/human-interface-guidelines', "Apple's guidance for designing apps on its platforms."],
  ['Figma YouTube Channel', 'design', 'intermediate', 'video', ['career'], 'https://www.youtube.com/@Figma', 'Tutorials and conference talks on interface design.'],
  ['Type Scale', 'design', 'intermediate', 'tool', ['career'], 'https://typescale.com/', 'Preview and pick a consistent type scale.'],
  ['Nielsen Norman Group Articles', 'design', 'advanced', 'article', ['career', 'class'], 'https://www.nngroup.com/articles/', 'Research-backed articles on usability and UX.'],
  ['Into Design Systems', 'design', 'advanced', 'video', ['career'], 'https://www.youtube.com/@intodesignsystems', 'Talks and tutorials on building design systems.'],
  ['Accessibility Insights', 'design', 'advanced', 'tool', ['career'], 'https://accessibilityinsights.io/', 'Find and fix accessibility issues in web and desktop apps.'],
]

async function idOf(email: string) {
  const { data, error } = await db.from('profiles').select('id').eq('email', email).maybeSingle()
  if (error || !data) throw new Error(`No account for ${email}.`)
  return data.id as string
}

const [owner, reviewer] = await Promise.all([idOf(ownerEmail), idOf(reviewerEmail)])
const { data: existing, error: readError } = await db.from('resources').select('url')
if (readError) throw readError
const known = new Set((existing ?? []).map((r) => r.url))

const now = Date.now()
const rows = library
  .filter(([, , , , , url]) => !known.has(url))
  .map(([title, subject, level, medium, goals, url, description], i) => ({
    owner_id: owner,
    title,
    subject,
    level,
    medium,
    goals,
    url,
    description,
    status: 'published',
    submitted_at: new Date(now - (i + 2) * 3_600_000).toISOString(),
    reviewed_at: new Date(now - (i + 1) * 3_600_000).toISOString(),
    reviewed_by: reviewer,
  }))

if (rows.length) {
  const { error } = await db.from('resources').insert(rows)
  if (error) throw error
}
console.log(`Added ${rows.length} resources (${library.length - rows.length} already in the library).`)
