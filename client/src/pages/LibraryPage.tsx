import StubPage from '../components/StubPage'

// S1-12 Browse the full content library as a professor
export default function LibraryPage() {
  return (
    <StubPage
      title="Content library"
      tasks="S1-12-T02, S1-12-T03"
      shows={[
        'Every published resource from GET /api/library, with its tags',
        'Loading, empty and error states (S1-12-T03)',
      ]}
    />
  )
}
