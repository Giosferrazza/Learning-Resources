import { useEffect, useRef, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import type { ListSummary } from '../lib/types'

// S1-11-T03 / S1-13: add a resource to one of your lists, or start a new list with it
export default function AddToList({ resourceId }: { resourceId: string }) {
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<ListSummary[] | null>(null)
  const [newName, setNewName] = useState('')
  const [message, setMessage] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (!lists) api<{ lists: ListSummary[] }>('/lists').then((d) => setLists(d.lists), (e) => setMessage(errorMessage(e)))
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, lists])

  async function add(listId: string, name: string) {
    try {
      await api(`/lists/${listId}/items`, { method: 'POST', body: { resourceId } })
      setMessage(`Added to ${name}`)
      setOpen(false)
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  async function create() {
    if (!newName.trim()) return
    try {
      const { list } = await api<{ list: ListSummary }>('/lists', { method: 'POST', body: { name: newName.trim(), resourceIds: [resourceId] } })
      setLists((ls) => [list, ...(ls ?? [])])
      setMessage(`Added to ${list.name}`)
      setNewName('')
      setOpen(false)
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  return (
    <div className="relative inline-flex flex-col items-end" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:border-rl-teal hover:text-rl-teal-dark">
        <i className="bi bi-collection" /> Add to list
      </button>
      {message && !open && <span className="mt-1 text-xs text-slate-500">{message}</span>}
      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
          {!lists && <p className="px-2 py-1 text-slate-500">Loading…</p>}
          {lists?.map((l) => (
            <button key={l.id} type="button" onClick={() => add(l.id, l.name)} className="block w-full truncate rounded px-2 py-1.5 text-left hover:bg-slate-50">
              {l.name} <span className="text-xs text-slate-400">({l.itemCount})</span>
            </button>
          ))}
          <div className="mt-1 flex gap-1 border-t border-slate-100 pt-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="New list name" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1" />
            <button type="button" onClick={create} className="rounded bg-rl-teal px-2 py-1 font-semibold text-white">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
