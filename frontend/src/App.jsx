import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Milestones from './pages/Milestones'
import Review from './pages/Review'
import { useAuth } from './hooks/useAuth'
import { Icon } from './components/Icons'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-accent text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-accent">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-bg to-surface/20"></div>
      <div className="absolute top-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

      <div className="relative z-10 text-center p-12 max-w-lg mx-4">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-accent/20 rounded-2xl flex items-center justify-center">
            <Icon name="gradCap" className="text-accent w-10 h-10" />
          </div>
          <h1 className="text-4xl font-medium text-accent mb-4">PFE Coach</h1>
          <p className="text-muted text-lg">AI-powered coaching for your final-year project</p>
        </div>

        <button
          onClick={loginWithGoogle}
          className="px-8 py-4 bg-accent text-bg font-medium text-lg hover:opacity-90 transition-all hover:scale-105 rounded"
        >
          Sign in with Google
        </button>

        <p className="text-xs text-muted mt-6">Your data is stored securely and privately</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute>
          <Layout>
            <Chat />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/milestones" element={
        <ProtectedRoute>
          <Layout>
            <Milestones />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/review" element={
        <ProtectedRoute>
          <Layout>
            <Review />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App