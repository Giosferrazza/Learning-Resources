import { NavLink } from 'react-router-dom'

const links = [
  { to: '/register', label: 'Sign up' },
  { to: '/login', label: 'Sign in' },
  { to: '/profile', label: 'Profile' },
  { to: '/change-password', label: 'Change password' },
]

export default function Navbar() {
  return (
    <nav className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <NavLink to="/" className="mr-auto font-semibold text-indigo-700">
        Learning Resources
      </NavLink>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-900')}>
          {l.label}
        </NavLink>
      ))}
      {/* TODO(S1-02-T01): sign-out button, shown only when signed in */}
    </nav>
  )
}
