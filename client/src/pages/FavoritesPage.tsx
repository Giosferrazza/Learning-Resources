import StubPage from '../components/StubPage'

// S1-36 View My Favorites
export default function FavoritesPage() {
  return (
    <StubPage
      title="My Favorites"
      tasks="S1-36-T02, S1-36-T03"
      shows={[
        'Saved resources and saved recommendation lists from GET /api/favorites',
        'Unsave control that removes the row without a reload (S1-36-T03)',
        'Empty state, and "no longer available" for removed resources (S1-36-T03)',
      ]}
    />
  )
}
