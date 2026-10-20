import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { api } from '../lib/api'
import { roleHome, roleLabel, roleNav } from '../lib/roles'

// Contextual navigation: signed-out visitors only see sign in / sign up; signed-in people see
// the links for their role (S1-11-T02) plus an account menu. Password reset lives on the
// sign-in page, change password in the account menu.
export default function Navbar() {
  const { session, profile, signOut } = useAuth()
  // Menus remember the page they were opened on, so navigating closes them
  const location = useLocation()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuOpen = menuPath === location.pathname

  const links = profile ? roleNav[profile.role] : []
  const linkClass = ({ isActive }: { isActive: boolean }) => `block rounded px-2 py-1 ${isActive ? 'text-rl-teal' : 'text-white/80 hover:text-rl-teal'}`

  return (
    <nav className="sticky top-0 z-20 bg-rl-navy shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to={profile ? roleHome[profile.role] : '/'} className="mr-auto text-lg font-bold whitespace-nowrap text-white">
          <i className="bi bi-mortarboard-fill mr-1" />
          Resource <span className="text-rl-teal">Learning</span>
        </Link>

        {links.length > 0 && (
          <div className="hidden items-center gap-2 text-sm md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>
        )}

        {session && profile ? (
          <div className="flex items-center gap-2">
            {(profile.role === 'educator' || profile.role === 'admin') && <NotificationBell />}
            <AccountMenu name={profile.display_name || profile.email} email={profile.email} role={roleLabel[profile.role]} onSignOut={signOut} />
            {links.length > 0 && (
              <button type="button" className="rounded p-1 text-2xl text-white md:hidden" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuPath(menuOpen ? null : location.pathname)}>
                <i className={`bi ${menuOpen ? 'bi-x' : 'bi-list'}`} />
              </button>
            )}
          </div>
        ) : (
          !session && (
            <div className="flex gap-2 text-sm">
              <Link to="/login" className="rounded border border-white/80 px-3 py-1.5 whitespace-nowrap text-white hover:bg-white hover:text-rl-navy">
                Sign In
              </Link>
              <Link to="/register" className="rounded bg-rl-teal px-3 py-1.5 font-semibold whitespace-nowrap text-white hover:bg-rl-teal-dark">
                Create Account
              </Link>
            </div>
          )
        )}
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 px-4 pb-3 text-sm md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

function AccountMenu({ name, email, role, onSignOut }: { name: string; email: string; role: string; onSignOut: () => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === location.pathname
  const setOpen = (next: boolean) => setOpenPath(next ? location.pathname : null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpenPath(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpenPath(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full bg-rl-teal font-semibold text-white uppercase hover:bg-rl-teal-dark"
        title="Account"
      >
        {name.trim().charAt(0) || '?'}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm text-rl-text shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-xs text-slate-500">
              {email} · {role}
            </p>
          </div>
          <Link role="menuitem" to="/account" className="block px-4 py-2 hover:bg-slate-50">
            <i className="bi bi-person mr-2" />
            Profile & settings
          </Link>
          <Link role="menuitem" to="/account/password" className="block px-4 py-2 hover:bg-slate-50">
            <i className="bi bi-key mr-2" />
            Change password
          </Link>
          <button
            role="menuitem"
            type="button"
            className="block w-full border-t border-slate-100 px-4 py-2 text-left hover:bg-slate-50"
            onClick={async () => {
              await onSignOut()
              navigate('/')
            }}
          >
            <i className="bi bi-box-arrow-right mr-2" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// S1-22 / S1-32: educators hear about flagged content, admins about alerts
function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api<{ unread: number }>('/notifications')
        .then((d) => !cancelled && setUnread(d.unread))
        .catch(() => {})
    load()
    const timer = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [location.pathname])

  return (
    <Link to="/notifications" className="relative rounded p-1 text-xl text-white/85 hover:text-rl-teal" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
      <i className="bi bi-bell" />
      {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-rl-gold px-1 text-center text-[10px] leading-4 font-bold text-rl-navy">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}
