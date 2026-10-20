import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { canAccess, roleHome } from '../lib/roles'
import type { Role } from '../lib/types'
import { Empty, LinkButton, Loading } from './ui'

// S1-02-T03 Protected navigation: signed-out visitors go to sign-in and come back afterwards.
// S1-28-T01: pages limited to some roles show a clear message instead of a broken page.
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (!profile) return <Loading label="Loading your account…" />
  if (!canAccess(profile.role, roles)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Empty icon="shield-lock" title="This page isn't available for your account">
          <LinkButton to={roleHome[profile.role]} className="mt-4">
            Go to your home page
          </LinkButton>
        </Empty>
      </div>
    )
  }
  return children
}

// Sign-in and sign-up pages send people who are already signed in to their home page.
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (session && profile) return <Navigate to={roleHome[profile.role]} replace />
  return children
}
