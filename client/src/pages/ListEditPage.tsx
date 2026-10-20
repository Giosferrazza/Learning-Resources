import { useParams } from 'react-router-dom'
import StubPage from '../components/StubPage'

// S1-13 edit list, S1-14 remove resources, S1-15 share with students
export default function ListEditPage() {
  const { id } = useParams()
  return (
    <StubPage
      title={`Edit list ${id}`}
      tasks="S1-13-T03, S1-14-T02, S1-14-T03, S1-15-T02"
      shows={[
        'Rename the list and add resources (S1-13-T03)',
        'Remove button with confirmation on each resource (S1-14-T02)',
        'Refresh after removal and an empty state when the last item goes (S1-14-T03)',
        'Share button that creates a link and copies it (S1-15-T02)',
      ]}
    />
  )
}
