import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Alert, Card, ConfirmButton, Empty, Loading, LoadError, Page, Pill, formatDate } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { roleLabel } from '../../lib/roles'
import type { Profile, Role } from '../../lib/types'
import { useApi } from '../../lib/useApi'

// S1-23 Manage user access, S1-28 Assign and change roles
export default function AdminUsersPage() {
  const { profile: me } = useAuth()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])
  const { data, setData, error, loading, reload } = useApi<{ users: Profile[] }>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function update(user: Profile, change: Partial<Profile>, path: 'role' | 'status', body: object, success: string) {
    setMessage(null)
    const before = data
    setData({ users: data!.users.map((u) => (u.id === user.id ? { ...u, ...change } : u)) })
    try {
      await api(`/admin/users/${user.id}/${path}`, { method: 'PATCH', body })
      setMessage({ kind: 'success', text: success })
    } catch (err) {
      setData(before)
      setMessage({ kind: 'error', text: errorMessage(err) })
    }
  }

  return (
    <Page title="Users and roles" subtitle="Role and access changes apply on the person’s next action.">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="mb-4 block w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm" />
      {message && (
        <div className="mb-4">
          <Alert kind={message.kind}>{message.text}</Alert>
        </div>
      )}
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.users.length && <Empty icon="people" title="No users match that search" />}
      <div className="space-y-2">
        {data?.users.map((u) => {
          const self = u.id === me?.id
          const name = u.display_name || u.email
          return (
            <Card key={u.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${u.account_status === 'suspended' ? 'bg-slate-50' : ''}`}>
              <div className="min-w-0">
                <p className="font-semibold">
                  {name} {self && <Pill tone="slate">You</Pill>} {u.account_status === 'suspended' && <Pill tone="red">Suspended</Pill>}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {u.email} · joined {formatDate(u.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Role for ${name}`}
                  value={u.role}
                  disabled={self}
                  title={self ? 'You can’t change your own role' : undefined}
                  onChange={(e) => update(u, { role: e.target.value as Role }, 'role', { role: e.target.value }, `${name} is now ${roleLabel[e.target.value as Role].toLowerCase()}.`)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                >
                  {Object.entries(roleLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {!self &&
                  (u.account_status === 'active' ? (
                    <ConfirmButton confirmLabel="Suspend" onConfirm={() => update(u, { account_status: 'suspended' }, 'status', { status: 'suspended' }, `${name} is suspended and signed out.`)}>
                      Suspend
                    </ConfirmButton>
                  ) : (
                    <ConfirmButton variant="secondary" confirmLabel="Reactivate" onConfirm={() => update(u, { account_status: 'active' }, 'status', { status: 'active' }, `${name} can sign in again.`)}>
                      Reactivate
                    </ConfirmButton>
                  ))}
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
