import { Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import Walkthrough from './components/Walkthrough'
import ChangePasswordPage from './pages/ChangePasswordPage'
import FavoritesPage from './pages/FavoritesPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import ListEditPage from './pages/ListEditPage'
import ListsPage from './pages/ListsPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
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

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-rl-text">
      <Navbar />
      <Walkthrough />
      <div className="flex-1 pb-10">
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/shared/:token" element={<SharedListPage />} />
  
          {/* TODO(S1-02-T02, S1-02-T03): wrap everything below in a ProtectedRoute once sessions exist */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
  
          {/* Students and professors (S1-11) */}
          <Route path="/questionnaire" element={<QuestionnairePage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/resource/:id" element={<ResourcePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/:id" element={<ListEditPage />} />
  
          {/* TODO(S1-28-T01): professor-only */}
          <Route path="/library" element={<LibraryPage />} />
  
          {/* TODO(S1-28-T01): educator-only */}
          <Route path="/resources/new" element={<ResourceFormPage />} />
          <Route path="/resources/:id/edit" element={<ResourceFormPage />} />
          <Route path="/my-submissions" element={<MySubmissionsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
  
          {/* TODO(S1-28-T01): admin-only */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
          <Route path="/admin/resources" element={<AdminResourcesPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/monitoring" element={<AdminMonitoringPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/errors" element={<AdminErrorLogsPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}
