import StubForm from '../components/StubForm'

// S1-02 Sign in and sign out
// TODO(S1-02-T01): build the real sign-in controls (sign-out lives in Navbar)
// TODO(S1-02-T03): show login errors and redirect to the protected page
// TODO(S1-05-T01): "Forgot password?" link to /forgot-password
export default function LoginPage() {
  return (
    <StubForm
      title="Sign in"
      tasks="S1-02-T01, S1-02-T03"
      submitLabel="Sign in"
      fields={[
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'password', label: 'Password', type: 'password' },
      ]}
    />
  )
}
