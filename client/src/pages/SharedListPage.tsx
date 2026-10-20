import { useParams } from 'react-router-dom'
import StubPage from '../components/StubPage'

// S1-15 Share a curated list with students (public, read-only)
export default function SharedListPage() {
  const { token } = useParams()
  return (
    <StubPage
      title="Shared list"
      tasks="S1-15-T03"
      shows={[`Read-only list from GET /api/shared/${token ?? ':token'}`, 'Clear message for invalid or revoked links']}
    />
  )
}
