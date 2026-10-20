import type { ReactNode } from 'react'

type Props = {
  title: string
  tasks: string
  // What the finished page should show, as a checklist for whoever picks up the task
  shows: string[]
  children?: ReactNode
}

// Placeholder for non-form S1 pages until each task replaces it.
export default function StubPage({ title, tasks, shows, children }: Props) {
  return (
    <div className="mx-auto mt-10 max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{title}</h1>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
        {shows.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {children}
      <p className="text-sm text-amber-700">Not implemented yet ({tasks})</p>
    </div>
  )
}
