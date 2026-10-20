import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  // Set when we sign someone out for a reason they should see on the sign-in page
  notice: string | null
  clearNotice: () => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// S1-02-T02 Session handling: Supabase keeps the session (and refreshes it); we load the
// profile from the API whenever the signed-in user changes.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      const { profile } = await api<{ profile: Profile }>('/me')
      setProfile(profile)
    } catch (err) {
      setProfile(null)
      if (!(err instanceof ApiError) || (err.code !== 'signed_out' && err.code !== 'account_suspended')) throw err
    }
  }, [])

  useEffect(() => {
    let userId: string | null = null
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      userId = data.session?.user.id ?? null
      if (data.session) await loadProfile().catch(() => {})
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      const nextId = next?.user.id ?? null
      if (nextId !== userId) {
        userId = nextId
        if (next) {
          setLoading(true)
          // Defer: Supabase warns against awaiting its own calls inside this callback
          setTimeout(() => void loadProfile().catch(() => {}).finally(() => setLoading(false)), 0)
        } else {
          setProfile(null)
        }
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  // The API rejected the session: expired, or the account was suspended (S1-23-T03)
  useEffect(() => {
    const onRejected = (e: Event) => {
      const err = (e as CustomEvent<ApiError>).detail
      setNotice(err.code === 'account_suspended' ? err.message : 'Your session has ended. Please sign in again.')
      void supabase.auth.signOut()
    }
    window.addEventListener('auth:rejected', onRejected)
    return () => window.removeEventListener('auth:rejected', onRejected)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, notice, clearNotice: () => setNotice(null), refreshProfile: loadProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
