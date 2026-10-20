import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, Tags } from './ui'

type Props = {
  id: string
  title: string
  description?: string
  subject?: string | null
  level?: string | null
  medium?: string | null
  actions?: ReactNode
  children?: ReactNode
}

export default function ResourceCard({ id, title, description, subject, level, medium, actions, children }: Props) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/resource/${id}`} className="font-semibold text-rl-text hover:text-rl-teal-dark hover:underline">
            {title}
          </Link>
          {description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-start gap-2">{actions}</div>}
      </div>
      <Tags subject={subject} level={level} medium={medium} />
      {children}
    </Card>
  )
}
