import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { sendMessage, getSessions, createSession, getSessionMessages, syncUser, deleteSession } from '../lib/api'
import { Icon } from '../components/Icons'

function Chat() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [sessionTitles, setSessionTitles] = useState({})
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
  const [currentAgent, setCurrentAgent] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (user) {
      syncUser(user).catch(console.error)
      fetchSessions()
    }
  }, [user])

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession)
    }
  }, [selectedSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchSessions = async () => {
    try {
      const response = await getSessions(user, 'chat')
      setSessions(response.data)
      
      const titles = {}
      await Promise.all(
        response.data.map(async (session) => {
          try {
            const msgs = await getSessionMessages(user, session.id)
            const firstMsg = msgs.data.find(m => m.role === 'user')
            const preview = firstMsg?.content?.slice(0, 30)?.replace(/\n/g, ' ') || 'New conversation'
            titles[session.id] = preview + (firstMsg?.content?.length > 30 ? '...' : '')
          } catch {
            titles[session.id] = 'New conversation'
          }
        })
      )
      setSessionTitles(titles)
      
      if (response.data.length > 0) {
        setSelectedSession(response.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const handleNewSession = async () => {
    try {
      const response = await createSession(user, 'chat')
      setSelectedSession(response.data.id)
      setMessages([])
      setSessions(prev => [response.data, ...prev])
      setSessionTitles(prev => ({ ...prev, [response.data.id]: 'New conversation' }))
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const fetchMessages = async (sessionId) => {
    try {
      const response = await getSessionMessages(user, sessionId)
      setMessages(response.data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation()
    e.preventDefault()
    
    try {
      await deleteSession(user, sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (selectedSession === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId)
        setSelectedSession(remaining.length > 0 ? remaining[0].id : null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const detectIntent = (message) => {
    const lower = message.toLowerCase()
    const progressKeywords = ['deadline', 'progress', 'milestone', 'due date', 'when is', 'completed', 'remaining', 'next milestone', 'overdue', 'tasks', 'planning', 'schedule']
    const writingKeywords = ['review', 'feedback', 'writing', 'draft', 'improve', 'edit', 'paragraph', 'section', 'rewrite']
    
    if (progressKeywords.some(kw => lower.includes(kw))) {
      return 'progress_tracker'
    }
    if (writingKeywords.some(kw => lower.includes(kw))) {
      return 'writing_coach'
    }
    return 'rag'
  }

  const handleSend = async () => {
    if (!input.trim() || !selectedSession) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setLoadingStage('Processing...')

    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const detectedIntent = detectIntent(userMessage)
      
      if (detectedIntent === 'rag') {
        setLoadingStage('Searching knowledge base...')
        await new Promise(r => setTimeout(r, 500))
        setLoadingStage('Fetching from web (MCP)...')
      } else if (detectedIntent === 'writing_coach') {
        setLoadingStage('Analyzing your writing...')
      } else if (detectedIntent === 'progress_tracker') {
        setLoadingStage('Loading milestone data...')
      }
      
      const response = await sendMessage(user, selectedSession, userMessage, detectedIntent)
      const agent = response.data.agent_used || 'rag_agent'
      const sources = response.data.sources_used || ''
      setCurrentAgent(agent)
      setLoadingStage('')

      setMessages(prev => [...prev, {
        id: 'temp-' + (Date.now() + 1),
        role: 'assistant',
        content: response.data.response,
        agent_used: agent,
        sources_used: sources,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Error sending message:', error)
      setLoadingStage('')
      setMessages(prev => [...prev, {
        id: 'temp-' + (Date.now() + 1),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        agent_used: 'error',
        created_at: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getAgentBadgeColor = (agent) => {
    const colors = {
      'rag_agent': 'bg-blue-500/20 text-blue-400',
      'writing_coach': 'bg-green-500/20 text-green-400',
      'progress_tracker': 'bg-purple-500/20 text-purple-400',
      'general': 'bg-gray-500/20 text-gray-400'
    }
    return colors[agent] || colors['general']
  }

  const getAgentLabel = (agent) => {
    const labels = {
      'rag_agent': 'Knowledge',
      'writing_coach': 'Writing',
      'progress_tracker': 'Progress',
      'general': 'Assistant'
    }
    return labels[agent] || 'Assistant'
  }

  const getAgentIcon = (agent) => {
    const icons = {
      'rag_agent': 'knowledge',
      'writing_coach': 'writing',
      'progress_tracker': 'progress',
      'general': 'bot'
    }
    return icons[agent] || 'bot'
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      <aside className="w-64 flex flex-col bg-surface border border-surface rounded-lg overflow-hidden">
        <div className="p-4 border-b border-surface/50">
          <button
            onClick={handleNewSession}
            className="w-full py-2.5 text-sm text-accent border border-accent rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="plus" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-muted text-sm">No conversations yet</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s.id)}
                className={`w-full text-left p-3 border-b border-surface/30 hover:bg-surface/50 transition-colors ${
                  selectedSession === s.id ? 'bg-surface' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-accent text-sm truncate flex-1 text-left">{sessionTitles[s.id] || 'New conversation'}</span>
                  <span
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="text-muted hover:text-danger p-1 flex-shrink-0"
                  >
                    <Icon name="trash" className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-muted text-xs mt-1">{formatDate(s.created_at)}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-surface border border-surface rounded-lg overflow-hidden">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-accent"><Icon name="chat" className="w-12 h-12" /></div>
              <p className="text-muted mb-4">Start a conversation</p>
              <button
                onClick={handleNewSession}
                className="text-accent hover:opacity-80 flex items-center gap-1"
              >
                Create new chat <Icon name="arrowRight" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="mb-3 text-accent"><Icon name="chat" className="w-8 h-8 mx-auto" /></div>
                    <p className="text-muted">Start chatting with your PFE Coach</p>
                    <p className="text-xs text-muted mt-2">Ask about methodology, get writing feedback, or track progress</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-accent/20 text-accent border border-accent/30'
                        : 'bg-surface border border-surface'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.agent_used && msg.role === 'assistant' && (
                        <div className="mt-3 pt-2 border-t border-surface/30 space-y-2">
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 w-fit ${getAgentBadgeColor(msg.agent_used)}`}>
                            <Icon name={getAgentIcon(msg.agent_used)} />
                            {getAgentLabel(msg.agent_used)}
                          </span>
                          {msg.sources_used && (
                            <div className="text-xs text-muted flex items-center gap-1">
                              <Icon name="search" className="w-3 h-3" />
                              {msg.sources_used}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-2xl p-4 bg-surface border border-surface">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-muted">{loadingStage || 'Thinking...'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-surface/50">
              {loading && loadingStage && (
                <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
                  </div>
                  <span>{loadingStage}</span>
                </div>
              )}
              {!loading && currentAgent && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs text-muted">Last response from:</span>
                  <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${getAgentBadgeColor(currentAgent)}`}>
                    <Icon name={getAgentIcon(currentAgent)} />
                    {getAgentLabel(currentAgent)}
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={loading || !selectedSession}
                  className="flex-1 p-3 bg-bg border border-surface rounded-lg text-accent text-sm resize-none focus:outline-none focus:border-accent/50"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || !selectedSession}
                  className="px-6 py-2 bg-accent text-bg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 self-end font-medium flex items-center gap-2"
                >
                  Send <Icon name="send" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Chat