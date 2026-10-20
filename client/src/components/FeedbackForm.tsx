import { useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { Alert, Button, TextArea } from './ui'

// S1-09 Rate or give feedback (one per person; sending again updates it)
export default function FeedbackForm({ resourceId, onSaved }: { resourceId: string; onSaved?: () => void }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  const [hadFeedback, setHadFeedback] = useState(false)

  useEffect(() => {
    api<{ feedback: { rating: number | null; comment: string } | null }>(`/resources/${resourceId}/feedback/mine`)
      .then(({ feedback }) => {
        if (!feedback) return
        setHadFeedback(true)
        setRating(feedback.rating ?? 0)
        setComment(feedback.comment)
      })
      .catch(() => {})
  }, [resourceId])

  // S1-09-T03 submission states
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!rating && !comment.trim()) return setState({ error: 'Pick a star rating or write a comment.' })
    setState({ busy: true })
    try {
      await api(`/resources/${resourceId}/feedback`, { method: 'POST', body: { rating: rating || null, comment } })
      setState({ ok: hadFeedback ? 'Your feedback was updated.' : 'Thanks for your feedback!' })
      setHadFeedback(true)
      onSaved?.()
    } catch (err) {
      setState({ error: errorMessage(err) })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="font-semibold">{hadFeedback ? 'Your rating' : 'Rate this resource'}</h2>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(rating === n ? 0 : n)} className="text-2xl text-rl-gold">
            <i className={`bi ${n <= rating ? 'bi-star-fill' : 'bi-star'}`} />
          </button>
        ))}
      </div>
      <TextArea label="Comment (optional)" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What was helpful? What was missing?" />
      {state.ok && <Alert kind="success">{state.ok}</Alert>}
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Button type="submit" busy={state.busy}>
        {hadFeedback ? 'Update feedback' : 'Send feedback'}
      </Button>
    </form>
  )
}
