import StubPage from '../components/StubPage'

// S1-07 basic output, S1-34 why it was recommended, S1-35 closest matches, S1-11 professor results
export default function RecommendationsPage() {
  return (
    <StubPage
      title="Your recommendations"
      tasks="S1-07-T03, S1-34-T02, S1-35-T03, S1-11-T03"
      shows={[
        'Resources returned by GET /api/recommendations for the latest questionnaire',
        'A short "why this was recommended" line per resource (S1-34-T02)',
        'A "closest matches" label when nothing matched exactly, and an empty-library state (S1-35-T03)',
        'Favorite button on each result and on the whole list (S1-08-T03)',
        'Links to each resource page; professors can add results to a list (S1-11-T03)',
      ]}
    />
  )
}
