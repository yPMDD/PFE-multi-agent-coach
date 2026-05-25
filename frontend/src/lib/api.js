import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const getAuthHeader = (user) => ({
  'X-User-Id': user?.uid || '',
  'Content-Type': 'application/json'
})

export const sendMessage = (user, sessionId, message, intent = "general") =>
  axios.post(`${API_URL}/invoke`, {
    student_id: user.uid,
    session_id: sessionId,
    message,
    intent,
  }, {
    headers: getAuthHeader(user)
  })

export const getMilestones = (user) =>
  axios.get(`${API_URL}/milestones`, {
    headers: getAuthHeader(user)
  })

export const updateMilestone = (user, id, data) =>
  axios.patch(`${API_URL}/milestones/${id}`, data, {
    headers: getAuthHeader(user)
  })

export const createMilestone = (user, data) =>
  axios.post(`${API_URL}/milestones`, data, {
    headers: getAuthHeader(user)
  })

export const deleteMilestone = (user, id) =>
  axios.delete(`${API_URL}/milestones/${id}`, {
    headers: getAuthHeader(user)
  })

export const getSessions = (user, sessionType = null) =>
  axios.get(`${API_URL}/sessions`, {
    params: sessionType ? { session_type: sessionType } : {},
    headers: getAuthHeader(user)
  })

export const createSession = (user, sessionType = 'chat') =>
  axios.post(`${API_URL}/sessions`, { session_type: sessionType }, {
    headers: getAuthHeader(user)
  })

export const deleteSession = (user, sessionId) =>
  axios.delete(`${API_URL}/sessions/${sessionId}`, {
    headers: getAuthHeader(user)
  })

export const getSessionMessages = (user, sessionId) =>
  axios.get(`${API_URL}/sessions/${sessionId}/messages`, {
    headers: getAuthHeader(user)
  })

export const syncUser = (user) =>
  axios.post(`${API_URL}/auth/sync`, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  }, {
    headers: getAuthHeader(user)
  })