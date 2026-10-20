import StubPage from '../../components/StubPage'

// S1-24 Manage the resource collection as an admin
export default function AdminResourcesPage() {
  return (
    <StubPage
      title="Resource collection"
      tasks="S1-24-T02"
      shows={[
        'Every resource in any status, filterable',
        'Edit, unpublish and remove actions (S1-24-T02)',
      ]}
    />
  )
}
