import StubPage from '../components/StubPage'

// S1-13 Name and edit a saved resource list
export default function ListsPage() {
  return (
    <StubPage
      title="My lists"
      tasks="S1-13-T01, S1-13-T03"
      shows={['Lists I own from GET /api/lists, each linking to /lists/:id', 'Create a new named list']}
    />
  )
}
