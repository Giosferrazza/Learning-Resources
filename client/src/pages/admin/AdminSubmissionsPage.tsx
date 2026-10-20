import StubPage from '../../components/StubPage'

// S1-26 View pending resource submissions, S1-25 Approve or reject
export default function AdminSubmissionsPage() {
  return (
    <StubPage
      title="Pending submissions"
      tasks="S1-26-T02, S1-26-T03, S1-25-T02"
      shows={[
        'Queue of pending resources, oldest first (S1-26-T02)',
        'Refresh, empty and error states (S1-26-T03)',
        'Review detail with Approve and Reject (with a note) (S1-25-T02)',
      ]}
    />
  )
}
