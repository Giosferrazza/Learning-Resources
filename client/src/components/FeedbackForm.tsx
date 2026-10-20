import StubForm from './StubForm'

// S1-09 Rate or give feedback on a recommended resource
// TODO(S1-09-T01): 1-5 rating control + optional comment, validation
// TODO(S1-09-T03): submitting/submitted/error states
export default function FeedbackForm() {
  return (
    <StubForm
      title="Rate this resource"
      tasks="S1-09-T01, S1-09-T03"
      submitLabel="Send feedback"
      fields={[
        { name: 'rating', label: 'Rating (1-5)', type: 'number' },
        { name: 'comment', label: 'Comment' },
      ]}
    />
  )
}
