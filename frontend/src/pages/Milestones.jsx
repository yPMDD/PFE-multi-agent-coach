import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getMilestones, updateMilestone, createMilestone, deleteMilestone, syncUser } from '../lib/api'
import { Icon } from '../components/Icons'

function Milestones() {
  const { user } = useAuth()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', description: '', due_date: '' })

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

  const handleEdit = (milestone) => {
    setEditingId(milestone.id)
    setEditForm({
      title: milestone.title,
      description: milestone.description || '',
      due_date: milestone.due_date ? milestone.due_date.split('T')[0] : ''
    })
  }

  const handleSave = async (id) => {
    try {
      await updateMilestone(user, id, editForm)
      setEditingId(null)
      fetchMilestones()
    } catch (error) {
      console.error('Error updating milestone:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleToggleComplete = async (milestone) => {
    try {
      await updateMilestone(user, milestone.id, { completed: !milestone.completed })
      fetchMilestones()
    } catch (error) {
      console.error('Error toggling milestone:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return
    try {
      await deleteMilestone(user, id)
      fetchMilestones()
    } catch (error) {
      console.error('Error deleting milestone:', error)
    }
  }

  const handleAddNew = async () => {
    if (!newForm.title.trim()) return
    try {
      await createMilestone(user, {
        title: newForm.title,
        description: newForm.description,
        due_date: newForm.due_date || new Date().toISOString()
      })
      setIsAddingNew(false)
      setNewForm({ title: '', description: '', due_date: '' })
      fetchMilestones()
    } catch (error) {
      console.error('Error creating milestone:', error)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = new Date(dateStr) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getProgress = () => {
    const completed = milestones.filter(m => m.completed).length
    const total = milestones.length
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const completedCount = milestones.filter(m => m.completed).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-medium text-accent mb-1">Milestones</h2>
          <p className="text-muted">{completedCount} of {milestones.length} completed</p>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="px-4 py-2 text-sm bg-accent text-bg rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          + Add Milestone
        </button>
      </div>

      <div className="bg-surface border border-surface rounded-lg p-1 mb-6">
        <div className="h-2 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-500"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      {isAddingNew && (
        <div className="mb-6 p-6 bg-surface border-2 border-accent/50 rounded-lg">
          <input
            type="text"
            placeholder="Milestone title"
            value={newForm.title}
            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
            className="w-full mb-3 p-3 bg-bg border border-surface rounded-lg text-accent text-sm focus:outline-none focus:border-accent"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newForm.description}
            onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
            className="w-full mb-3 p-3 bg-bg border border-surface rounded-lg text-accent text-sm focus:outline-none focus:border-accent"
          />
          <div className="flex gap-3">
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-accent text-bg rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Add Milestone
            </button>
            <button
              onClick={() => { setIsAddingNew(false); setNewForm({ title: '', description: '', due_date: '' }) }}
              className="px-4 py-2 text-muted hover:text-accent text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted">Loading...</div>
      ) : milestones.length === 0 ? (
        <div className="bg-surface border border-surface rounded-lg p-8 text-center">
          <div className="mb-4 text-accent"><Icon name="milestone" className="w-12 h-12 mx-auto" /></div>
          <p className="text-muted mb-2">No milestones yet</p>
          <p className="text-sm text-muted mb-4">Create milestones to track your PFE progress</p>
          <button
            onClick={() => setIsAddingNew(true)}
            className="text-accent hover:opacity-80"
          >
            Create your first milestone
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const daysUntil = getDaysUntil(milestone.due_date)
            return (
              <div key={milestone.id} className="bg-surface border border-surface rounded-lg overflow-hidden">
                {editingId === milestone.id ? (
                  <div className="p-4">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full mb-2 p-2 bg-bg border border-surface rounded text-accent text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full mb-2 p-2 bg-bg border border-surface rounded text-accent text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      className="p-2 bg-bg border border-surface rounded text-accent text-sm focus:outline-none focus:border-accent mb-3"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(milestone.id)} className="text-sm text-accent hover:opacity-80">Save</button>
                      <button onClick={handleCancel} className="text-sm text-muted hover:text-accent">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 border-l-4 ${milestone.completed ? 'border-muted' : 'border-accent'}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleToggleComplete(milestone)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                            milestone.completed
                              ? 'bg-accent border-accent'
                              : 'border-muted hover:border-accent'
                          }`}
                        >
                          {milestone.completed && <Icon name="check" className="text-bg" />}
                        </button>
                        <div className="flex-1">
                          <h3 className={`text-base font-medium ${milestone.completed ? 'text-muted line-through' : 'text-accent'}`}>
                            {milestone.title}
                          </h3>
                          {milestone.description && (
                            <p className="text-sm text-muted mt-1">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted">
                            <span className="flex items-center gap-1">
                              <Icon name="calendar" />
                              {formatDate(milestone.due_date)}
                            </span>
                            {!milestone.completed && daysUntil !== null && (
                              <span className={`flex items-center gap-1 ${daysUntil <= 3 ? 'text-danger' : daysUntil <= 7 ? 'text-yellow-500' : ''}`}>
                                <Icon name="clock" />
                                {daysUntil <= 0 ? 'Overdue' : `${daysUntil} days left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(milestone)} className="text-sm text-muted hover:text-accent px-2 py-1 flex items-center gap-1">
                          <Icon name="edit" /> Edit
                        </button>
                        <button onClick={() => handleDelete(milestone.id)} className="text-sm text-danger hover:opacity-80 px-2 py-1 flex items-center gap-1">
                          <Icon name="trash" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Milestones