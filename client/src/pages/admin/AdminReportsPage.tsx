import StubPage from '../../components/StubPage'

// S1-27 Review flagged or reported content as an admin
export default function AdminReportsPage() {
  return (
    <StubPage
      title="Flagged content"
      tasks="S1-27-T02, S1-27-T03"
      shows={[
        'Open reports queue with resource and reporter (S1-27-T02)',
        'Resolve or dismiss with a note; optionally remove the resource (S1-27-T03)',
      ]}
    />
  )
}
