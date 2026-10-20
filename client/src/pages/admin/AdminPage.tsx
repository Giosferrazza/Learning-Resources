import { Link } from 'react-router-dom'

const sections = [
  { to: '/admin/users', label: 'Users and roles', tasks: 'S1-23, S1-28' },
  { to: '/admin/submissions', label: 'Pending submissions', tasks: 'S1-25, S1-26' },
  { to: '/admin/resources', label: 'Resource collection', tasks: 'S1-24' },
  { to: '/admin/reports', label: 'Flagged content', tasks: 'S1-27' },
  { to: '/admin/monitoring', label: 'Uptime and performance', tasks: 'S1-29, S1-32' },
  { to: '/admin/analytics', label: 'Usage analytics', tasks: 'S1-30' },
  { to: '/admin/errors', label: 'Error logs', tasks: 'S1-31' },
]

// TODO(S1-28-T01): only admins can reach /admin/*
export default function AdminPage() {
  return (
    <div className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
      {sections.map((s) => (
        <Link key={s.to} to={s.to} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
          <div className="font-medium">{s.label}</div>
          <div className="text-xs text-slate-500">{s.tasks}</div>
        </Link>
      ))}
    </div>
  )
}
