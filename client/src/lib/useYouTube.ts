import { useEffect, useState } from 'react'
import { api, errorMessage } from './api'
import type { YouTubeResults } from './discovery'

const pending = new Map<string, Promise<YouTubeResults>>()

// Mounted under a questionnaire/user key. StrictMode remounts share one in-flight GET.
export function useYouTube(userId: string, responseId: string) {
  const [data, setData] = useState<YouTubeResults | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const key = `${userId}:${responseId}`
    let request = pending.get(key)
    if (!request) {
      request = api<YouTubeResults>(`/youtube/recommendations?responseId=${encodeURIComponent(responseId)}`)
      pending.set(key, request)
      void request.then(() => pending.delete(key), () => pending.delete(key))
    }
    void request.then((result) => { if (active) setData(result) }, (err: unknown) => { if (active) setError(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, responseId])
  return { data, error, loading }
}
