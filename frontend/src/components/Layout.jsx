import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Icon } from './Icons'

function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/chat', label: 'Chat', icon: 'chat' },
    { path: '/milestones', label: 'Milestones', icon: 'milestone' },
    { path: '/review', label: 'Writing', icon: 'review' }
  ]

  return (
    <div className="min-h-screen bg-bg">
      <header className="h-16 flex items-center justify-between px-8 border-b border-surface bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <Icon name="gradCap" className="text-accent" />
          </div>
          <h1 className="text-lg font-medium text-accent">PFE Coach</h1>
        </div>

        <nav className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                location.pathname === link.path
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-accent hover:bg-surface/50'
              }`}
            >
              <Icon name={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-8 h-8 rounded-full border-2 border-surface"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm">
              {user?.displayName?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-sm text-accent hidden md:inline">{user?.displayName?.split(' ')[0]}</span>
          <button
            onClick={logout}
            className="text-sm text-muted hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface/50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="p-6">
        {children}
      </main>
    </div>
  )
}

export default Layout