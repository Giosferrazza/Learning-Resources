import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'

function HomePage() {
  return (
    <div className="mx-auto mt-16 max-w-xl text-center">
      <h1 className="text-3xl font-bold">Personalized Learning Resources</h1>
      <p className="mt-3 text-slate-600">Answer a short questionnaire and get videos, articles, and tools matched to your goals.</p>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* TODO(S1-02-T02, S1-02-T03): wrap these two in a ProtectedRoute once sessions exist */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Routes>
    </div>
  )
}
