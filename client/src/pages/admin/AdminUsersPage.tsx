import StubPage from '../../components/StubPage'

// S1-23 Manage user account access, S1-28 Assign and change user roles
export default function AdminUsersPage() {
  return (
    <StubPage
      title="Users and roles"
      tasks="S1-23-T02, S1-28-T03"
      shows={[
        'All users with role and account status from GET /api/admin/users',
        'Suspend / reactivate (S1-23-T02); suspended users are signed out (S1-23-T03)',
        'Role picker per user; an admin cannot demote themselves (S1-28-T03)',
      ]}
    />
  )
}
