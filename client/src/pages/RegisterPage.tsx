import StubForm from '../components/StubForm'

// S1-01 Create an account
// TODO(S1-01-T01): build the real registration form + validation
// TODO(S1-01-T03): show success/error feedback and navigate after sign-up
export default function RegisterPage() {
  return (
    <StubForm
      title="Create an account"
      tasks="S1-01-T01, S1-01-T03"
      submitLabel="Sign up"
      fields={[
        { name: 'displayName', label: 'Name' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'password', label: 'Password', type: 'password' },
      ]}
    />
  )
}
