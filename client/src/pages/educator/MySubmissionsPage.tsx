import StubPage from '../../components/StubPage'

// S1-19 View all resources submitted by an educator, S1-20 Clone
export default function MySubmissionsPage() {
  return (
    <StubPage
      title="My submissions"
      tasks="S1-19-T02, S1-19-T03, S1-20-T02"
      shows={[
        'All my resources from GET /api/resources/mine with status (draft, pending, published, rejected)',
        'Rejection note when rejected',
        'Edit and Clone actions; Clone opens the copied draft (S1-20-T02)',
        'Loading, empty and error states (S1-19-T03)',
      ]}
    />
  )
}
