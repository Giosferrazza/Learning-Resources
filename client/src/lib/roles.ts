import type { Role } from './types'

// Where each role lands after signing in, and what the navbar shows them.
export const roleHome: Record<Role, string> = {
  student: '/recommendations',
  professor: '/library',
  educator: '/my-submissions',
  admin: '/admin',
}

export const roleLabel: Record<Role, string> = { student: 'Student', professor: 'Professor', educator: 'Educator', admin: 'Admin' }

export const roleNav: Record<Role, { to: string; label: string }[]> = {
  student: [
    { to: '/questionnaires', label: 'My questionnaires' },
    { to: '/recommendations', label: 'Recommendations' },
    { to: '/favorites', label: 'Favorites' },
    { to: '/lists', label: 'My lists' },
  ],
  professor: [
    { to: '/questionnaires', label: 'Lesson plans' },
    { to: '/library', label: 'Library' },
    { to: '/lists', label: 'My lists' },
    { to: '/favorites', label: 'Favorites' },
  ],
  educator: [
    { to: '/my-submissions', label: 'My submissions' },
    { to: '/library', label: 'Library' },
    { to: '/insights', label: 'Reports' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/submissions', label: 'Review' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/support', label: 'Support' },
  ],
}

// Admins can open every role's pages.
export const canAccess = (role: Role, allowed?: Role[]) => !allowed || role === 'admin' || allowed.includes(role)
