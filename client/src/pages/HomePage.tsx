import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Landing page, ported from David's Bootstrap mockup (index_standalone.html).
// His sign-in/sign-up/questionnaire modals are the /login, /register and /questionnaire pages here.

const primaryBtn = 'inline-flex items-center justify-center rounded-md bg-rl-teal px-5 py-3 font-semibold text-white hover:bg-rl-teal-dark'
const outlineLightBtn = 'inline-flex items-center justify-center rounded-md border border-white/80 px-5 py-3 font-medium text-white hover:bg-white hover:text-rl-navy'
const pill = 'inline-block rounded-full border border-rl-teal bg-rl-teal/20 px-3 py-1 text-xs font-semibold text-rl-teal'

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`h-full rounded-2xl bg-white p-6 shadow-[0_4px_14px_rgba(20,33,61,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(20,33,61,0.14)] ${className}`}>
      {children}
    </div>
  )
}

function Icon({ name, center = false }: { name: string; center?: boolean }) {
  return (
    <div className={`mb-3 flex size-13 items-center justify-center rounded-[0.85rem] bg-rl-teal/15 text-2xl text-rl-teal-dark ${center ? 'mx-auto' : ''}`}>
      <i className={`bi bi-${name}`} />
    </div>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h2 className="mb-2 text-center text-3xl font-bold">{title}</h2>
      <p className="mb-10 text-center text-slate-500">{subtitle}</p>
    </>
  )
}

const steps = [
  { icon: 'ui-checks', title: '1. Answer the questionnaire', body: "Choose your subject, knowledge level, preferred learning medium, and what you're trying to achieve." },
  { icon: 'stars', title: '2. Get your recommendations', body: 'See a curated list drawn from our content library, and filter it to narrow things down.' },
  { icon: 'heart-fill', title: '3. Save your favorites', body: 'Favorite (or un-favorite) any resource so your best finds are waiting for you next time.' },
]

const roles = [
  { icon: 'person-workspace', title: 'Students', body: 'Take questionnaires, get recommendations, filter results, and save favorites.' },
  { icon: 'easel2', title: 'Professors', body: 'Use the questionnaire to plan lessons and curate lectures from existing resources.' },
  { icon: 'cloud-upload', title: 'Educators', body: 'Add, update, and remove content, and view reports on student learning preferences.' },
]

const roadmap = [
  {
    badge: 'High priority',
    badgeClass: 'bg-red-600 text-white',
    title: 'Core experience',
    items: ['Create an account', 'Secure sign in and sign out', 'Intuitive interface', 'Complete the student questionnaire', 'Filter recommendations', 'Favorite and un-favorite resources'],
  },
  {
    badge: 'Medium priority',
    badgeClass: 'bg-rl-gold text-rl-text',
    title: 'Educators and professors',
    items: ['Take multiple questionnaires', 'Professors plan lessons with the questionnaire', 'Educators add and remove content', 'Educators report on student preferences', 'Edit profile and change password'],
  },
]

export default function HomePage() {
  return (
    <>
      <header className="bg-[radial-gradient(circle_at_80%_20%,rgba(31,181,168,0.25),transparent_45%),linear-gradient(135deg,var(--color-rl-navy-deep)_0%,var(--color-rl-navy)_100%)] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 text-center lg:grid-cols-12 lg:text-left">
          <div className="lg:col-span-7">
            <span className={`${pill} mb-4`}>Personalized learning, in minutes</span>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Resource Learning</h1>
            <p className="mt-4 text-xl text-[#dbe7f5]">
              Tell us what you want to learn. We'll find the videos, articles, and tools that fit <em>you</em>.
            </p>
            <p className="mx-auto mt-4 max-w-[38rem] text-[#b8c7da] lg:mx-0">
              Answer a short questionnaire about your subject, knowledge level, and goals, and get a tailored list of curated resources. Save the
              ones you love and come back to them any time.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to="/questionnaire" className={primaryBtn}>
                <i className="bi bi-clipboard2-check mr-2" />
                Take the Questionnaire
              </Link>
              <Link to="/register" className={outlineLightBtn}>
                Create a Free Account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white p-6 text-left text-rl-text shadow-2xl">
              <p className="mb-2 text-xs font-semibold tracking-[0.06em] text-rl-teal-dark uppercase">Featured: Personalized Recommendations</p>
              <h2 className="text-2xl font-bold">Your goals. Your level. Your format.</h2>
              <ul className="mt-4 mb-6 space-y-2">
                {['Pick a subject and knowledge level', 'Choose videos, articles, or tools', 'Filter your recommendation list', 'Favorite resources and revisit them later'].map((item) => (
                  <li key={item}>
                    <i className="bi bi-check-circle-fill mr-2 text-rl-teal" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/questionnaire" className={`${primaryBtn} w-full`}>
                Get My Recommendations
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="how-it-works" className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="How It Works" subtitle={'Three quick steps from "where do I start?" to a plan.'} />
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <Card key={s.title} className="text-center">
                  <Icon name={s.icon} center />
                  <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                  <p>{s.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="bg-rl-light py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="Built for Everyone in the Learning Loop" subtitle="Three roles, one platform. Here's what each one does." />
            <div className="grid gap-6 md:grid-cols-3">
              {roles.map((r) => (
                <Card key={r.title}>
                  <Icon name={r.icon} />
                  <h3 className="mb-2 text-lg font-bold">{r.title}</h3>
                  <p>{r.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="favorites" className="py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-3xl font-bold">Your Favorites, All in One Place</h2>
              <p className="mb-5">
                Found a video that finally made the concept click? Heart it. Your saved resources stay tied to your account so you can return to
                them later, and you can un-favorite anything at any time.
              </p>
              <Link to="/favorites" className={primaryBtn}>
                Sign In to View Favorites
              </Link>
            </div>
            {/* Sample card showing the look of a saved resource; real data comes with S1-36 */}
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`${pill} mb-2`}>Video</span>
                  <h3 className="mb-1 font-bold">Sample resource title</h3>
                  <p className="text-sm text-slate-500">Subject &middot; Beginner &middot; Matches your goal</p>
                </div>
                <button type="button" aria-label="Toggle favorite" className="rounded border border-red-500 px-2 py-1 text-sm text-red-500 hover:bg-red-500 hover:text-white">
                  <i className="bi bi-heart-fill" />
                </button>
              </div>
            </Card>
          </div>
        </section>

        <section id="roadmap" className="bg-rl-light py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="What We're Building" subtitle="Highlights from our product backlog, grouped by priority." />
            <div className="grid gap-6 md:grid-cols-2">
              {roadmap.map((r) => (
                <Card key={r.title}>
                  <span className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${r.badgeClass}`}>{r.badge}</span>
                  <h3 className="mb-2 text-lg font-bold">{r.title}</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {r.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="support" className="py-16 text-center">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-2 text-3xl font-bold">Ready to find your next resource?</h2>
            <p className="mb-6 text-slate-500">It takes about a minute. Questions? Our support page has you covered.</p>
            {/* TODO: add a "Visit Support" button once a support page exists */}
            <Link to="/questionnaire" className={primaryBtn}>
              Start the Questionnaire
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
