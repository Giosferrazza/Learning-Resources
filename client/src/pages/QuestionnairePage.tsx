import StubForm from '../components/StubForm'

// S1-07 Complete topic and knowledge-level questionnaire (+ S1-33 learning goal, S1-11 professors use it too)
// TODO(S1-07-T01): selects driven by lib/vocabulary.ts, required-field validation
// TODO(S1-33-T02): goal input, saved with the answers
// TODO(S1-11-T02): professor wording ("for your course" instead of "for you")
export default function QuestionnairePage() {
  return (
    <StubForm
      title="What do you want to learn?"
      tasks="S1-07-T01, S1-33-T02"
      submitLabel="Get recommendations"
      fields={[
        { name: 'topic', label: 'Topic' },
        { name: 'knowledgeLevel', label: 'Your knowledge level' },
        { name: 'preferredMedium', label: 'Preferred format' },
        { name: 'goal', label: 'Learning goal' },
      ]}
    />
  )
}
