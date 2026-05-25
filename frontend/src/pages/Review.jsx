import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { sendMessage, syncUser, createSession, getSessionMessages, getSessions } from '../lib/api'
import { Icon } from '../components/Icons'

function Review() {
  const { user } = useAuth()
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewSessionId, setReviewSessionId] = useState(null)
  const [reviewHistory, setReviewHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (user) {
      syncUser(user).catch(console.error)
      fetchReviewHistory()
    }
  }, [user])

  const fetchReviewHistory = async () => {
    try {
      const response = await getSessions(user, 'review')
      const sessions = response.data
      
      const sessionsWithTitles = await Promise.all(
        sessions.map(async (session) => {
          try {
            const msgs = await getSessionMessages(user, session.id)
            const userMsg = msgs.data.find(m => m.role === 'user')
            const firstLine = userMsg?.content?.split('\n')[0]?.slice(0, 40) || ''
            return { ...session, title: firstLine || 'Untitled Review' }
          } catch {
            return { ...session, title: 'Untitled Review' }
          }
        })
      )
      setReviewHistory(sessionsWithTitles)
    } catch (error) {
      console.error('Error fetching review history:', error)
    }
  }

  const handleSubmit = async () => {
    if (!draft.trim()) return

    setLoading(true)
    setError('')
    setFeedback(null)

    try {
      let sessionId = reviewSessionId
      if (!sessionId) {
        const sessionResponse = await createSession(user, 'review')
        sessionId = sessionResponse.data.id
        setReviewSessionId(sessionId)
        fetchReviewHistory()
      }

      const response = await sendMessage(user, sessionId, draft, 'writing_coach')

      const feedbackData = response.data.response
      setFeedback(feedbackData)
    } catch (err) {
      console.error('Error submitting review:', err)
      setError('Failed to get feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setDraft('')
    setFeedback(null)
    setError('')
    setReviewSessionId(null)
  }

  const handleLoadFromHistory = async (session) => {
    try {
      setReviewSessionId(session.id)
      const response = await getSessionMessages(user, session.id)
      const messages = response.data
      const userMessage = messages.find(m => m.role === 'user')
      if (userMessage) {
        setDraft(userMessage.content)
      }
      const assistantMessage = messages.find(m => m.role === 'assistant')
      if (assistantMessage) {
        setFeedback(assistantMessage.content)
      }
      setShowHistory(false)
    } catch (error) {
      console.error('Error loading review:', error)
    }
  }

  const parseFeedback = (feedbackStr) => {
    try {
      return JSON.parse(feedbackStr)
    } catch {
      return null
    }
  }

  const parsedFeedback = feedback ? parseFeedback(feedback) : null

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      {showHistory && (
        <div className="w-64 bg-surface border border-surface rounded-lg overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-surface/50">
            <h3 className="text-sm font-medium text-accent">History</h3>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {reviewHistory.length === 0 ? (
              <div className="p-4 text-center text-muted text-sm">No reviews yet</div>
            ) : (
              reviewHistory.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleLoadFromHistory(session)}
                  className="w-full text-left p-3 border-b border-surface/30 hover:bg-surface/50 transition-colors"
                >
                  <div className="text-accent text-sm font-medium truncate">{session.title}</div>
                  <div className="text-muted text-xs mt-1">{new Date(session.created_at).toLocaleDateString()}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-6 min-w-0">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-muted font-medium">Your Draft</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className="text-xs text-muted hover:text-accent px-2 py-1"
              >
                {showHistory ? 'Hide' : 'History'}
              </button>
              <button onClick={handleClear} className="text-xs text-muted hover:text-accent px-2 py-1">
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your writing here for feedback..."
            className="flex-1 p-4 bg-surface border border-surface rounded-lg text-accent text-sm resize-none focus:outline-none focus:border-accent/50"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !draft.trim()}
            className="mt-4 py-3 bg-accent text-bg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            {loading ? 'Analyzing...' : 'Get Feedback'}
          </button>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-muted font-medium mb-3 block">Feedback</label>
          <div className="flex-1 p-4 bg-surface border border-surface rounded-lg overflow-y-auto">
            {!feedback ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="mb-4 text-accent"><Icon name="review" className="w-12 h-12" /></div>
                <p className="text-muted mb-2">Submit your draft to receive feedback</p>
                <p className="text-xs text-muted max-w-xs">The Writing Coach analyzes your text for clarity, structure, tone, and content</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
                <p className="text-danger">{error}</p>
              </div>
            ) : parsedFeedback ? (
              <div className="space-y-5">
                <div className="pb-4 border-b border-surface/50">
                  <h3 className="text-sm font-medium text-accent mb-2 flex items-center gap-2">
                    <Icon name="dashboard" /> Overall Assessment
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{parsedFeedback.overall}</p>
                </div>

                {parsedFeedback.issues && parsedFeedback.issues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-accent mb-3 flex items-center gap-2">
                      <Icon name="edit" /> Areas for Improvement
                    </h3>
                    <div className="space-y-3">
                      {parsedFeedback.issues.map((issue, idx) => (
                        <div key={idx} className="p-3 bg-bg border border-surface rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs uppercase px-2 py-0.5 bg-surface text-accent rounded">
                              {issue.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted mb-2">{issue.description}</p>
                          <p className="text-sm text-accent">→ {issue.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedFeedback.strengths && parsedFeedback.strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-accent mb-2 flex items-center gap-2">
                      <Icon name="check" /> Strengths
                    </h3>
                    <ul className="space-y-2">
                      {parsedFeedback.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-muted flex items-start gap-2">
                          <Icon name="check" className="text-accent mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedFeedback.next_step && (
                  <div className="pt-4 border-t border-surface/50">
                    <h3 className="text-sm font-medium text-accent mb-2 flex items-center gap-2">
                      <Icon name="milestone" /> Next Step
                    </h3>
                    <p className="text-sm text-accent bg-bg p-3 border border-surface rounded-lg">
                      {parsedFeedback.next_step}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <pre className="text-sm text-muted whitespace-pre-wrap">{feedback}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Review