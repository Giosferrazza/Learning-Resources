import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { GuestOnly, RequireAuth } from './components/RequireAuth'
import { Empty, LinkButton, Loading } from './components/ui'
import Walkthrough from './components/Walkthrough'
import { roleHome } from './lib/roles'
import AccountPage from './pages/AccountPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import FavoritesPage from './pages/FavoritesPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import ListEditPage from './pages/ListEditPage'
import ListsPage from './pages/ListsPage'
import LoginPage from './pages/LoginPage'
import QuestionnairePage from './pages/QuestionnairePage'
import RecommendationsPage from './pages/RecommendationsPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ResourcePage from './pages/ResourcePage'
import SharedListPage from './pages/SharedListPage'
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage'
import AdminErrorLogsPage from './pages/admin/AdminErrorLogsPage'
import AdminMonitoringPage from './pages/admin/AdminMonitoringPage'
import AdminPage from './pages/admin/AdminPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminResourcesPage from './pages/admin/AdminResourcesPage'
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import MySubmissionsPage from './pages/educator/MySubmissionsPage'
import NotificationsPage from './pages/educator/NotificationsPage'
import ResourceFormPage from './pages/educator/ResourceFormPage'

// Signed-in people skip the marketing page and land on their role's home
function Landing() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (session && profile) return <Navigate to={roleHome[profile.role]} replace />
  return <HomePage />
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Empty icon="signpost-split" title="Page not found">
        <LinkButton to="/" className="mt-4">
          Go home
        </LinkButton>
      </Empty>
    </div>
  )
}

const guard = (element: React.ReactNode, roles?: Parameters<typeof RequireAuth>[0]['roles']) => <RequireAuth roles={roles}>{element}</RequireAuth>
const guest = (element: React.ReactNode) => <GuestOnly>{element}</GuestOnly>

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-rl-text">
      <ScrollManager />
      <Navbar />
      <Walkthrough />
      <main className="flex-1 pb-10">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={guest(<LoginPage />)} />
          <Route path="/register" element={guest(<RegisterPage />)} />
          <Route path="/forgot-password" element={guest(<ForgotPasswordPage />)} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/shared/:token" element={<SharedListPage />} />

          {/* Any signed-in account */}
          <Route path="/account" element={guard(<AccountPage />)} />
          <Route path="/account/password" element={guard(<ChangePasswordPage />)} />
          <Route path="/resource/:id" element={guard(<ResourcePage />)} />
          <Route path="/notifications" element={guard(<NotificationsPage />)} />

          {/* Students and professors (S1-11) */}
          <Route path="/questionnaire" element={guard(<QuestionnairePage />, ['student', 'professor'])} />
          <Route path="/recommendations" element={guard(<RecommendationsPage />, ['student', 'professor'])} />
          <Route path="/favorites" element={guard(<FavoritesPage />, ['student', 'professor'])} />
          <Route path="/lists" element={guard(<ListsPage />, ['student', 'professor'])} />
          <Route path="/lists/:id" element={guard(<ListEditPage />, ['student', 'professor'])} />
          <Route path="/library" element={guard(<LibraryPage />, ['professor', 'educator'])} />

          {/* Educators */}
          <Route path="/my-submissions" element={guard(<MySubmissionsPage />, ['educator'])} />
          <Route path="/resources/new" element={guard(<ResourceFormPage />, ['educator'])} />
          <Route path="/resources/:id/edit" element={guard(<ResourceFormPage />, ['educator'])} />

          {/* Admins */}
          <Route path="/admin" element={guard(<AdminPage />, ['admin'])} />
          <Route path="/admin/users" element={guard(<AdminUsersPage />, ['admin'])} />
          <Route path="/admin/submissions" element={guard(<AdminSubmissionsPage />, ['admin'])} />
          <Route path="/admin/resources" element={guard(<AdminResourcesPage />, ['admin'])} />
          <Route path="/admin/reports" element={guard(<AdminReportsPage />, ['admin'])} />
          <Route path="/admin/monitoring" element={guard(<AdminMonitoringPage />, ['admin'])} />
          <Route path="/admin/analytics" element={guard(<AdminAnalyticsPage />, ['admin'])} />
          <Route path="/admin/errors" element={guard(<AdminErrorLogsPage />, ['admin'])} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
