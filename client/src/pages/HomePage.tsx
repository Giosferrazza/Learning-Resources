import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { roleHome } from '../lib/roles'

// Landing page, ported from David's Bootstrap mockup (index_standalone.html).
// His sign-in/sign-up/questionnaire modals are the /login, /register and /questionnaire pages here.

const primaryBtn = 'inline-flex items-center justify-center rounded-md bg-rl-teal px-5 py-3 font-semibold text-white hover:bg-rl-teal-dark'
const outlineLightBtn = 'inline-flex items-center justify-center rounded-md border border-white/80 px-5 py-3 font-medium text-white hover:bg-white hover:text-rl-navy'

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
  { icon: 'ui-checks', title: '1. Answer the questionnaire', body: 'Pick your subject, level, format and goal.' },
  { icon: 'stars', title: '2. Get your recommendations', body: 'A matched list you can filter.' },
  { icon: 'heart-fill', title: '3. Save your favorites', body: 'Keep your best finds for next time.' },
]

const roles = [
  { icon: 'person-workspace', title: 'Students', body: 'Take questionnaires, get recommendations, filter results, and save favorites.' },
  { icon: 'easel2', title: 'Professors', body: 'Use the questionnaire to plan lessons and curate lectures from existing resources.' },
  { icon: 'cloud-upload', title: 'Educators', body: 'Add, update, and remove content, and view reports on student learning preferences.' },
]

export default function HomePage() {
  // Signed-in people can come back here from the logo, so swap sign-up calls to action for their own page
  const { profile } = useAuth()
  return (
    <>
      <header className="bg-[radial-gradient(circle_at_80%_20%,rgba(31,181,168,0.25),transparent_45%),linear-gradient(135deg,var(--color-rl-navy-deep)_0%,var(--color-rl-navy)_100%)] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 text-center lg:grid-cols-12 lg:text-left">
          <div className="lg:col-span-7">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Resource Learning</h1>
            <p className="mt-4 text-xl text-[#dbe7f5]">
              Tell us what you want to learn. We'll find the videos, articles, and tools that fit <em>you</em>.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to="/questionnaire" className={primaryBtn}>
                <i className="bi bi-clipboard2-check mr-2" />
                Take the Questionnaire
              </Link>
              {profile ? (
                <Link to={roleHome[profile.role]} className={outlineLightBtn}>
                  Go to my dashboard
                </Link>
              ) : (
                <Link to="/register" className={outlineLightBtn}>
                  Create a Free Account
                </Link>
              )}
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
