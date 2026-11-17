import { SideNav } from '../../components/ui'

// S2-01-T02 Section navigation for educator reports
export default function InsightsNav() {
  return (
    <SideNav
      title="Reports"
      links={[
        { to: '/insights', label: 'Preferences and favorites', icon: 'heart' },
        { to: '/insights/engagement', label: 'Engagement', icon: 'graph-up' },
      ]}
    />
  )
}
