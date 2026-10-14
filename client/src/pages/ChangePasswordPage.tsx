import StubForm from '../components/StubForm'

// S1-03 Change password
// TODO(S1-03-T01): build the real change-password form
// TODO(S1-03-T03): show success and failure feedback
export default function ChangePasswordPage() {
  return (
    <StubForm
      title="Change password"
      tasks="S1-03-T01, S1-03-T03"
      submitLabel="Update password"
      fields={[
        { name: 'currentPassword', label: 'Current password', type: 'password' },
        { name: 'newPassword', label: 'New password', type: 'password' },
        { name: 'confirmPassword', label: 'Confirm new password', type: 'password' },
      ]}
    />
  )
}
