import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { trackResource } from '../lib/api'
import type { Rating } from '../lib/types'
import { buttonClass, Card, Stars, Tags } from './ui'

type Props = {
  id: string
  title: string
  description?: string
  subject?: string | null
  level?: string | null
  medium?: string | null
  actions?: ReactNode
  children?: ReactNode
  externalUrl?: string
  thumbnail?: string | null
  attribution?: string
  sourceLabel?: string
  // S2-14: curated cards get a direct open button and their rating
  url?: string | null
  rating?: Rating
}

export default function ResourceCard({ id, title, description, subject, level, medium, actions, children, externalUrl, thumbnail, attribution, sourceLabel, url, rating }: Props) {
  return (
    <Card className="flex flex-col gap-3">
      {thumbnail && <a href={externalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${title}`}><img src={thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" /></a>}
      {sourceLabel && <p className="text-xs font-semibold text-slate-600">{sourceLabel}</p>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {externalUrl ? <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-rl-text hover:text-rl-teal-dark hover:underline">{title}</a> : <Link to={`/resource/${id}`} className="font-semibold text-rl-text hover:text-rl-teal-dark hover:underline">
            {title}
          </Link>}
          {attribution && <p className="mt-1 text-xs text-slate-500">{attribution}</p>}
          {description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-start gap-2">{actions}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Tags subject={subject} level={level} medium={medium} />
        <Stars rating={rating} compact />
      </div>
      {children}
      {!externalUrl && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => trackResource(id, 'open')} className={buttonClass('primary', 'px-3 py-1.5')}>
              <i className="bi bi-box-arrow-up-right" aria-hidden /> Open resource
            </a>
          )}
          <Link to={`/resource/${id}`} className={buttonClass('secondary', 'px-3 py-1.5')}>
            Details
          </Link>
        </div>
      )}
    </Card>
  )
}
