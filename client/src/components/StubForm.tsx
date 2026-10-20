import { useState, type FormEvent } from 'react'

type Field = { name: string; label: string; type?: string }

type Props = {
  title: string
  tasks: string
  fields: Field[]
  submitLabel: string
}

// Placeholder form shared by the S1 pages until each task replaces it.
export default function StubForm({ title, tasks, fields, submitLabel }: Props) {
  const [message, setMessage] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(`Not implemented yet (${tasks})`)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{title}</h1>
      {fields.map((f) => (
        <label key={f.name} className="block text-sm font-medium text-slate-700">
          {f.label}
          <input name={f.name} type={f.type ?? 'text'} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
      ))}
      <button type="submit" className="w-full rounded bg-rl-teal px-3 py-2 font-semibold text-white hover:bg-rl-teal-dark">
        {submitLabel}
      </button>
      {message && <p className="text-sm text-amber-700">{message}</p>}
    </form>
  )
}
