import StubForm from '../components/StubForm'

// S1-05 Request a password reset (landing page from the email link)
// TODO(S1-05-T01): new-password screen; call supabase.auth.updateUser({ password })
// TODO(S1-05-T03): expired/invalid link errors, success then redirect to /login
export default function ResetPasswordPage() {
  return (
    <StubForm
      title="Choose a new password"
      tasks="S1-05-T01, S1-05-T03"
      submitLabel="Update password"
      fields={[
        { name: 'password', label: 'New password', type: 'password' },
        { name: 'confirmPassword', label: 'Confirm new password', type: 'password' },
      ]}
    />
  )
}
