import { Link, NavLink } from 'react-router-dom'

// Styling from David's mockup (navy bar, teal accents).
// TODO(S1-11-T02, S1-28-T01): show links by role (student/professor/educator/admin) instead of all of them
const links = [
  { to: '/questionnaire', label: 'Questionnaire' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/lists', label: 'Lists' },
  { to: '/library', label: 'Library' },
  { to: '/my-submissions', label: 'My submissions' },
  { to: '/resources/new', label: 'Upload' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/admin', label: 'Admin' },
  { to: '/profile', label: 'Profile' },
  { to: '/change-password', label: 'Change password' },
]

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-10 bg-rl-navy shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <Link to="/" className="mr-auto text-lg font-bold text-white">
          <i className="bi bi-mortarboard-fill mr-1" />
          Resource <span className="text-rl-teal">Learning</span>
        </Link>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end className={({ isActive }) => (isActive ? 'text-rl-teal' : 'text-white/75 hover:text-rl-teal')}>
            {l.label}
          </NavLink>
        ))}
        {/* TODO(S1-02-T01): swap these for a sign-out button when signed in */}
        <div className="flex gap-2">
          <Link to="/login" className="rounded border border-white/80 px-3 py-1 text-white hover:bg-white hover:text-rl-navy">
            Sign In
          </Link>
          <Link to="/register" className="rounded bg-rl-teal px-3 py-1 font-semibold text-white hover:bg-rl-teal-dark">
            Create Account
          </Link>
        </div>
      </div>
    </nav>
  )
}
