import { useState } from 'react'
import { exportFormats, type ExportFormat } from '../../../shared/vocabulary'
import { download, errorMessage } from '../lib/api'
import { Alert, Button, Card } from './ui'

// S2-08-T01 / S2-08-T03 Export a curated list for a syllabus or LMS
export default function ExportList({ listId, listName, availableCount }: { listId: string; listName: string; availableCount: number }) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({})

  async function run() {
    setState({ busy: true })
    try {
      const name = await download(`/lists/${listId}/export?format=${format}`, `${listName}.${format}`)
      setState({ ok: `Downloaded ${name}.` })
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Export for a syllabus or LMS</h2>
      <p className="mt-1 text-sm text-slate-600">Each resource’s title, type, level, subject and link. Unavailable resources are left out.</p>
      <fieldset className="mt-3">
        <legend className="sr-only">File format</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(exportFormats) as [ExportFormat, string][]).map(([key, label]) => (
            <label key={key} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${format === key ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
              <input type="radio" name="export-format" value={key} checked={format === key} onChange={() => setFormat(key)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={run} busy={state.busy} disabled={availableCount === 0}>
          <i className="bi bi-download" aria-hidden /> Export list
        </Button>
        {availableCount === 0 && <span className="text-sm text-slate-500">Add at least one available resource to export.</span>}
      </div>
      {state.ok && (
        <div className="mt-3">
          <Alert kind="success">{state.ok}</Alert>
        </div>
      )}
      {state.error && (
        <div className="mt-3">
          <Alert kind="error">{state.error}</Alert>
        </div>
      )}
    </Card>
  )
}
