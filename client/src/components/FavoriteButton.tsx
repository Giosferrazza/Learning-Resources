import { useState } from 'react'
import { useFavorites } from '../auth/FavoritesProvider'
import { errorMessage } from '../lib/api'

// S1-08 Favorite and unfavorite a resource or a saved list
export default function FavoriteButton({ resourceId, listId, withLabel }: { resourceId?: string; listId?: string; withLabel?: boolean }) {
  const { isSaved, toggle } = useFavorites()
  const [error, setError] = useState('')
  const saved = isSaved({ resourceId, listId })

  async function click() {
    setError('')
    try {
      await toggle({ resourceId, listId })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={click}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
        title={saved ? 'Remove from favorites' : 'Save to favorites'}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition ${saved ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:text-red-600'}`}
      >
        <i className={`bi ${saved ? 'bi-heart-fill' : 'bi-heart'}`} />
        {withLabel && (saved ? 'Saved' : 'Save')}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  )
}
