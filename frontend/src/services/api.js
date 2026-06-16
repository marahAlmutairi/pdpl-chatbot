import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const sendMessage = (question, session_id = null) =>
  api.post('/chat', { question, session_id })

export const uploadFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload', form)
}

export const getSessions = () => api.get('/sessions')

export const getSessionMessages = (sessionId) =>
  api.get(`/sessions/${sessionId}/messages`)

export const createSession = (title = 'محادثة جديدة') =>
  api.post('/sessions', { title })

export const deleteSession = (sessionId) =>
  api.delete(`/sessions/${sessionId}`)

export const getAnalytics = () => api.get('/analytics')
