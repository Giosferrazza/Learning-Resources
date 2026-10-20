import StubPage from '../../components/StubPage'

// S1-31 View application error logs
export default function AdminErrorLogsPage() {
  return (
    <StubPage
      title="Error logs"
      tasks="S1-31-T03"
      shows={[
        'Newest errors first with level, route and time; filter by level (S1-31-T03)',
      ]}
    />
  )
}
