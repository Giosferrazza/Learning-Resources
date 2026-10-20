import { Link } from 'react-router-dom'
import { useFavorites } from '../auth/FavoritesProvider'
import FavoriteButton from '../components/FavoriteButton'
import ResourceCard from '../components/ResourceCard'
import { Card, Empty, LinkButton, Loading, Page } from '../components/ui'

// S1-36 View My Favorites (resources and saved recommendation lists)
export default function FavoritesPage() {
  const { favorites, loaded } = useFavorites()
  if (!loaded) return <Loading />

  const resources = favorites.filter((f) => f.resource)
  const lists = favorites.filter((f) => f.list)

  if (!favorites.length) {
    return (
      <Page title="My Favorites">
        <Empty icon="heart" title="Nothing saved yet">
          <p>Tap the heart on any resource, or save a whole recommendation list.</p>
          <LinkButton to="/recommendations" className="mt-4">
            See recommendations
          </LinkButton>
        </Empty>
      </Page>
    )
  }

  return (
    <Page title="My Favorites" subtitle={`${resources.length} resource${resources.length === 1 ? '' : 's'}, ${lists.length} list${lists.length === 1 ? '' : 's'}`}>
      {lists.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">Saved lists</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {lists.map(({ id, list }) => (
              <Card key={id} className="flex items-center justify-between gap-3">
                <Link to={`/lists/${list!.id}`} className="min-w-0 font-semibold hover:text-rl-teal-dark hover:underline">
                  <i className="bi bi-collection mr-2 text-rl-teal" />
                  {list!.name || 'Saved list'} <span className="text-sm font-normal text-slate-500">({list!.itemCount})</span>
                </Link>
                <FavoriteButton listId={list!.id} />
              </Card>
            ))}
          </div>
        </section>
      )}
      {resources.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-700">Saved resources</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map(({ id, resource }) =>
              resource!.available ? (
                <ResourceCard key={id} id={resource!.id!} title={resource!.title} subject={resource!.subject} level={resource!.level} medium={resource!.medium} actions={<FavoriteButton resourceId={resource!.id!} />} />
              ) : (
                // S1-36-T03 unavailable resources stay listed so people know what happened
                <Card key={id} className="flex items-center justify-between gap-3 bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-500 line-through">{resource!.title}</p>
                    <p className="text-sm text-slate-500">No longer available</p>
                  </div>
                  {resource!.id && <FavoriteButton resourceId={resource!.id} />}
                </Card>
              ),
            )}
          </div>
        </section>
      )}
    </Page>
  )
}
