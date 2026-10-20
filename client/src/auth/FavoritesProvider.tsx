import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { ResourceSummary } from '../lib/types'
import { useAuth } from './AuthProvider'

export type Favorite = { id: string; created_at: string; resource: ResourceSummary | null; list: { id: string; name: string; itemCount: number } | null }

type FavoritesState = {
  favorites: Favorite[]
  loaded: boolean
  reload: () => Promise<void>
  isSaved: (target: { resourceId?: string; listId?: string }) => boolean
  toggle: (target: { resourceId?: string; listId?: string }) => Promise<void>
}

const FavoritesContext = createContext<FavoritesState | null>(null)

// S1-08-T03 Favorite state shared by every heart button, with optimistic toggles that roll back on error.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    const { favorites } = await api<{ favorites: Favorite[] }>('/favorites')
    setFavorites(favorites)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (profile) void reload().catch(() => setLoaded(true))
    else {
      setFavorites([])
      setLoaded(false)
    }
  }, [profile, reload])

  const find = useCallback(
    ({ resourceId, listId }: { resourceId?: string; listId?: string }) =>
      favorites.find((f) => (resourceId ? f.resource?.id === resourceId : f.list?.id === listId)),
    [favorites],
  )

  const toggle = useCallback(
    async (target: { resourceId?: string; listId?: string }) => {
      const existing = find(target)
      if (existing) {
        setFavorites((fs) => fs.filter((f) => f.id !== existing.id))
        try {
          await api(`/favorites/${existing.id}`, { method: 'DELETE' })
        } catch (err) {
          setFavorites((fs) => [existing, ...fs])
          throw err
        }
      } else {
        const placeholder: Favorite = {
          id: `pending-${Date.now()}`,
          created_at: new Date().toISOString(),
          resource: target.resourceId ? { id: target.resourceId, title: '', subject: null, level: null, medium: null, available: true } : null,
          list: target.listId ? { id: target.listId, name: '', itemCount: 0 } : null,
        }
        setFavorites((fs) => [placeholder, ...fs])
        try {
          await api('/favorites', { method: 'POST', body: target })
          await reload()
        } catch (err) {
          setFavorites((fs) => fs.filter((f) => f.id !== placeholder.id))
          throw err
        }
      }
    },
    [find, reload],
  )

  return <FavoritesContext.Provider value={{ favorites, loaded, reload, isSaved: (t) => Boolean(find(t)), toggle }}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider')
  return ctx
}
