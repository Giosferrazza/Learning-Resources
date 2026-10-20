// S1-08 Favorite and unfavorite resources or recommendation lists
// TODO(S1-08-T03): saved/unsaved state, optimistic toggle, revert on error
type Props = { resourceId?: string; listId?: string }

export default function FavoriteButton(_props: Props) {
  return (
    <button type="button" disabled className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-500" title="Not implemented yet (S1-08-T03)">
      ☆ Save
    </button>
  )
}
