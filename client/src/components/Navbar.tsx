import { NavLink } from 'react-router-dom'

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
  { to: '/register', label: 'Sign up' },
  { to: '/login', label: 'Sign in' },
  { to: '/profile', label: 'Profile' },
  { to: '/change-password', label: 'Change password' },
]

export default function Navbar() {
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-6 py-3 text-sm">
      <NavLink to="/" className="mr-auto font-semibold text-indigo-700">
        Learning Resources
      </NavLink>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end className={({ isActive }) => (isActive ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-900')}>
          {l.label}
        </NavLink>
      ))}
      {/* TODO(S1-02-T01): sign-out button, shown only when signed in */}
    </nav>
  )
}
