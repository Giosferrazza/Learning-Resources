import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

// Loads a GET endpoint. `loading` is only true before the first response, so reload()
// refreshes in place without flashing a spinner. Pass null to skip loading.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [pending, setPending] = useState(path !== null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    setPending(true)
    setError(null)
    api<T>(path)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setPending(false))
    return () => {
      cancelled = true
    }
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, setData, error, loading: pending && data === null && error === null, refreshing: pending, reload }
}
