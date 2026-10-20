import StubPage from '../../components/StubPage'

// S1-29 Monitor system uptime and performance, S1-32 alerts
export default function AdminMonitoringPage() {
  return (
    <StubPage
      title="Uptime and performance"
      tasks="S1-29-T03, S1-32-T03"
      shows={[
        'Current health, recent uptime checks and response times (S1-29-T03)',
        'Recent alerts with delivery status (S1-32-T03)',
      ]}
    />
  )
}
