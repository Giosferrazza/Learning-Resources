import { useParams } from 'react-router-dom'
import FavoriteButton from '../components/FavoriteButton'
import FeedbackForm from '../components/FeedbackForm'
import ReportForm from '../components/ReportForm'
import StubPage from '../components/StubPage'

// Resource detail: home for S1-08 favorite, S1-09 feedback, S1-10 report
export default function ResourcePage() {
  const { id } = useParams()
  return (
    <>
      <StubPage
        title={`Resource ${id}`}
        tasks="S1-08-T03, S1-09-T01, S1-10-T01"
        shows={['Title, description, tags and link/file', 'Unavailable state if the resource was removed (S1-24-T03)']}
      >
        <FavoriteButton resourceId={id} />
      </StubPage>
      <FeedbackForm />
      <ReportForm />
    </>
  )
}
