import StubForm from '../components/StubForm'

// S1-04 Update profile information
// TODO(S1-04-T01): build the real profile edit form
// TODO(S1-04-T03): saving/saved/error states and reload after save
export default function ProfilePage() {
  return (
    <StubForm
      title="Your profile"
      tasks="S1-04-T01, S1-04-T03"
      submitLabel="Save changes"
      fields={[
        { name: 'displayName', label: 'Name' },
        { name: 'email', label: 'Email', type: 'email' },
      ]}
    />
  )
}
