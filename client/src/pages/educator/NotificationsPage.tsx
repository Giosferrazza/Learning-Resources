import { Link } from 'react-router-dom'
import { Button, Empty, Loading, LoadError, Page, formatDateTime } from '../../components/ui'
import { api } from '../../lib/api'
import type { Notification } from '../../lib/types'
import { useApi } from '../../lib/useApi'

const icons: Record<string, string> = {
  content_flagged: 'flag',
  submission_approved: 'patch-check',
  submission_rejected: 'x-octagon',
  resource_removed: 'trash',
  alert_outage: 'exclamation-triangle',
  alert_recovery: 'check-circle',
  alert_critical_error: 'bug',
  alert_error_burst: 'bug',
}

// S1-22 Notifications (flags, review decisions; admin alerts from S1-32)
export default function NotificationsPage() {
  const { data, setData, error, loading, reload } = useApi<{ notifications: Notification[]; unread: number }>('/notifications')

  // S1-22-T03 read state
  async function markRead(n: Notification) {
    if (n.read_at || !data) return
    setData({ notifications: data.notifications.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)), unread: data.unread - 1 })
    await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(reload)
  }

  async function markAll() {
    if (!data) return
    setData({ notifications: data.notifications.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })), unread: 0 })
    await api('/notifications/read-all', { method: 'POST' }).catch(reload)
  }

  return (
    <Page title="Notifications" actions={data && data.unread > 0 && <Button variant="secondary" onClick={markAll}>Mark all as read</Button>}>
      {loading && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {data && !data.notifications.length && <Empty icon="bell" title="You’re all caught up" />}
      <ul className="space-y-2">
        {data?.notifications.map((n) => {
          const body = (
            <div className={`flex gap-3 rounded-xl border p-4 ${n.read_at ? 'border-slate-200 bg-white' : 'border-rl-teal/40 bg-rl-teal/5'}`}>
              <i className={`bi bi-${icons[n.type] ?? 'bell'} text-lg ${n.read_at ? 'text-slate-400' : 'text-rl-teal-dark'}`} />
              <div className="min-w-0 flex-1">
                <p className={n.read_at ? 'text-slate-600' : 'font-medium'}>{n.message}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-rl-teal" aria-label="Unread" />}
            </div>
          )
          return (
            <li key={n.id} onClick={() => markRead(n)}>
              {n.resource_id ? <Link to={n.type === 'submission_rejected' ? `/resources/${n.resource_id}/edit` : `/resource/${n.resource_id}`}>{body}</Link> : <button type="button" className="block w-full text-left">{body}</button>}
            </li>
          )
        })}
      </ul>
    </Page>
  )
}
