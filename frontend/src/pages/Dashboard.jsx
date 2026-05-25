import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getMilestones, syncUser } from '../lib/api'
import { Icon } from '../components/Icons'

function Dashboard() {
  const { user } = useAuth()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      syncUser(user).catch(console.error)
      fetchMilestones()
    }
  }, [user])

  const fetchMilestones = async () => {
    try {
      const response = await getMilestones(user)
      setMilestones(response.data)
    } catch (error) {
      console.error('Error fetching milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const completedCount = milestones.filter(m => m.completed).length
  const totalCount = milestones.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = new Date(dateStr) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-accent mb-2">
          Welcome back, {user?.displayName?.split(' ')[0]}
        </h2>
        <p className="text-muted">Here's your PFE project overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-surface p-5 rounded-lg hover:border-accent/50 transition-colors">
          <div className="text-3xl font-medium text-accent mb-1">{completedCount}</div>
          <div className="text-sm text-muted">Completed</div>
        </div>
        <div className="bg-surface border border-surface p-5 rounded-lg hover:border-accent/50 transition-colors">
          <div className="text-3xl font-medium text-accent mb-1">{totalCount - completedCount}</div>
          <div className="text-sm text-muted">In Progress</div>
        </div>
        <div className="bg-surface border border-surface p-5 rounded-lg hover:border-accent/50 transition-colors">
          <div className="text-3xl font-medium text-accent mb-1">{progress}%</div>
          <div className="text-sm text-muted">Progress</div>
        </div>
      </div>

      <div className="bg-surface border border-surface rounded-lg p-1 mb-6">
        <div className="h-3 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-accent">Upcoming Milestones</h3>
        <Link
          to="/milestones"
          className="text-sm text-accent hover:opacity-80 flex items-center gap-1"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted">Loading...</div>
      ) : milestones.length === 0 ? (
        <div className="bg-surface border border-surface rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-muted mb-4">No milestones yet</p>
          <Link
            to="/milestones"
            className="inline-block px-4 py-2 bg-accent text-bg rounded-lg hover:opacity-90 transition-opacity"
          >
            Create your first milestone
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.slice(0, 4).map((milestone) => {
            const daysUntil = getDaysUntil(milestone.due_date)
            return (
              <div
                key={milestone.id}
                className={`bg-surface border border-surface rounded-lg p-4 hover:border-accent/30 transition-colors ${
                  milestone.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      milestone.completed ? 'bg-accent border-accent' : 'border-muted'
                    }`}>
                      {milestone.completed && <Icon name="check" className="text-bg" />}
                    </div>
                    <div>
                      <h3 className={`text-base font-medium ${milestone.completed ? 'text-muted line-through' : 'text-accent'}`}>
                        {milestone.title}
                      </h3>
                      {milestone.description && (
                        <p className="text-sm text-muted mt-1">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted flex items-center gap-1">
                      <Icon name="calendar" />
                      {formatDate(milestone.due_date)}
                    </div>
                    {!milestone.completed && daysUntil !== null && (
                      <div className={`text-xs mt-1 flex items-center gap-1 ${daysUntil <= 3 ? 'text-danger' : daysUntil <= 7 ? 'text-yellow-500' : 'text-muted'}`}>
                        <Icon name="clock" />
                        {daysUntil <= 0 ? 'Overdue' : `${daysUntil} days left`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/chat" className="bg-surface border border-surface rounded-lg p-6 hover:border-accent/30 transition-colors group">
          <div className="mb-2 text-accent"><Icon name="chat" className="w-6 h-6" /></div>
          <h3 className="text-accent font-medium mb-1 group-hover:text-accent/80">Chat with Coach</h3>
          <p className="text-sm text-muted">Get AI-powered guidance for your PFE</p>
        </Link>
        <Link to="/review" className="bg-surface border border-surface rounded-lg p-6 hover:border-accent/30 transition-colors group">
          <div className="mb-2 text-accent"><Icon name="review" className="w-6 h-6" /></div>
          <h3 className="text-accent font-medium mb-1 group-hover:text-accent/80">Writing Review</h3>
          <p className="text-sm text-muted">Get feedback on your academic writing</p>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard