import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { GuestOnly, RequireAuth } from './components/RequireAuth'
import { Empty, LinkButton, SideNav, WithSideNav } from './components/ui'
import Walkthrough from './components/Walkthrough'
import AccountPage from './pages/AccountPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import FavoritesPage from './pages/FavoritesPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import ListEditPage from './pages/ListEditPage'
import ListsPage from './pages/ListsPage'
import LoginPage from './pages/LoginPage'
import { HistoryDetailPage, HistoryPage } from './pages/HistoryPage'
import QuestionnairePage from './pages/QuestionnairePage'
import QuestionnairesPage from './pages/QuestionnairesPage'
import SupportPage from './pages/SupportPage'
import EngagementPage, { EngagementDetailPage } from './pages/insights/EngagementPage'
import PreferencesReportPage from './pages/insights/PreferencesReportPage'
import AdminRulesPage from './pages/admin/AdminRulesPage'
import AdminSupportPage from './pages/admin/AdminSupportPage'
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

// S2-01-T02 Admin side navigation: every admin tool, one click away
const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: 'speedometer2' },
  { to: '/admin/submissions', label: 'Review', icon: 'patch-check' },
  { to: '/admin/reports', label: 'Reports', icon: 'flag' },
  { to: '/admin/support', label: 'Support', icon: 'life-preserver' },
  { to: '/admin/users', label: 'Users', icon: 'people' },
  { to: '/admin/resources', label: 'Resources', icon: 'collection' },
  { to: '/admin/rules', label: 'Recommendation rules', icon: 'sliders' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'graph-up' },
  { to: '/admin/monitoring', label: 'Monitoring', icon: 'activity' },
  { to: '/admin/errors', label: 'Error logs', icon: 'bug' },
]
const adminPage = (element: React.ReactNode) => <RequireAuth roles={['admin']}><WithSideNav nav={<SideNav title="Admin" links={adminLinks} />}>{element}</WithSideNav></RequireAuth>

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
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={guest(<LoginPage />)} />
          <Route path="/register" element={guest(<RegisterPage />)} />
          <Route path="/forgot-password" element={guest(<ForgotPasswordPage />)} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/shared/:token" element={<SharedListPage />} />
          <Route path="/support" element={<SupportPage />} />

          {/* Any signed-in account */}
          <Route path="/account" element={guard(<AccountPage />)} />
          <Route path="/account/password" element={guard(<ChangePasswordPage />)} />
          <Route path="/resource/:id" element={guard(<ResourcePage />)} />
          <Route path="/notifications" element={guard(<NotificationsPage />)} />

          {/* Students and professors (S1-11) */}
          <Route path="/questionnaires" element={guard(<QuestionnairesPage />, ['student', 'professor'])} />
          <Route path="/questionnaire" element={guard(<QuestionnairePage />, ['student', 'professor'])} />
          <Route path="/questionnaire/:id/edit" element={guard(<QuestionnairePage />, ['student', 'professor'])} />
          <Route path="/history" element={guard(<HistoryPage />, ['student', 'professor'])} />
          <Route path="/history/:id" element={guard(<HistoryDetailPage />, ['student', 'professor'])} />
          <Route path="/recommendations" element={guard(<RecommendationsPage />, ['student', 'professor'])} />
          <Route path="/favorites" element={guard(<FavoritesPage />, ['student', 'professor'])} />
          <Route path="/lists" element={guard(<ListsPage />, ['student', 'professor'])} />
          <Route path="/lists/:id" element={guard(<ListEditPage />, ['student', 'professor'])} />
          <Route path="/library" element={guard(<LibraryPage />, ['professor', 'educator'])} />

          {/* Educators */}
          <Route path="/my-submissions" element={guard(<MySubmissionsPage />, ['educator'])} />
          <Route path="/resources/new" element={guard(<ResourceFormPage />, ['educator'])} />
          <Route path="/resources/:id/edit" element={guard(<ResourceFormPage />, ['educator'])} />
          <Route path="/insights" element={guard(<PreferencesReportPage />, ['educator'])} />
          <Route path="/insights/engagement" element={guard(<EngagementPage />, ['educator'])} />
          <Route path="/insights/engagement/:id" element={guard(<EngagementDetailPage />, ['educator'])} />

          {/* Admins */}
          <Route path="/admin" element={adminPage(<AdminPage />)} />
          <Route path="/admin/users" element={adminPage(<AdminUsersPage />)} />
          <Route path="/admin/submissions" element={adminPage(<AdminSubmissionsPage />)} />
          <Route path="/admin/resources" element={adminPage(<AdminResourcesPage />)} />
          <Route path="/admin/reports" element={adminPage(<AdminReportsPage />)} />
          <Route path="/admin/monitoring" element={adminPage(<AdminMonitoringPage />)} />
          <Route path="/admin/analytics" element={adminPage(<AdminAnalyticsPage />)} />
          <Route path="/admin/errors" element={adminPage(<AdminErrorLogsPage />)} />
          <Route path="/admin/support" element={adminPage(<AdminSupportPage />)} />
          <Route path="/admin/rules" element={adminPage(<AdminRulesPage />)} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
