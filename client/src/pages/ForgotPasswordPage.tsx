import StubForm from '../components/StubForm'

// S1-05 Request a password reset
// TODO(S1-05-T01): request screen; call supabase.auth.resetPasswordForEmail with redirectTo /reset-password
// TODO(S1-05-T03): same confirmation whether or not the email exists; show rate-limit errors
export default function ForgotPasswordPage() {
  return (
    <StubForm
      title="Reset your password"
      tasks="S1-05-T01, S1-05-T03"
      submitLabel="Send reset link"
      fields={[{ name: 'email', label: 'Email', type: 'email' }]}
    />
  )
}
